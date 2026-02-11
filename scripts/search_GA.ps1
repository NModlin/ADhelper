# Active Directory Audit Script
# Purpose: Scan a specific group for employees in Georgia/Atlanta, excluding remote workers.

# --- Configuration ---
$GroupName = "CN=All_Employees,OU=Adaxes Managed,OU=Security Groups,DC=RPL,DC=Local"
$OutputFile = "GA_Employees_Audit.csv"
$ExcludeKeyword = "Remote"

# Check if Active Directory module is available
if (!(Get-Module -ListAvailable ActiveDirectory)) {
    Write-Error "The Active Directory module is required. Please install RSAT (Remote Server Administration Tools)."
    return
}

Write-Host "Starting AD scan for group: $GroupName" -ForegroundColor Cyan

try {
    # 1. Verify the Group exists first
    try {
        $Group = Get-ADGroup -Identity $GroupName -ErrorAction Stop
    } catch {
        Write-Error "Could not find the group at path: $GroupName. Please verify the Distinguished Name."
        return
    }

    # 2. Get all members of the specified group
    $GroupMembers = Get-ADGroupMember -Identity $GroupName -Recursive -ErrorAction Stop | 
                    Where-Object { $_.objectClass -eq "user" }
    
    if ($null -eq $GroupMembers -or $GroupMembers.Count -eq 0) {
        Write-Warning "The group '$GroupName' is empty or contains no user objects."
        return
    }

    $TotalCount = $GroupMembers.Count
    $CurrentIndex = 0
    Write-Host "Found $TotalCount total members to check. Processing..." -ForegroundColor Yellow

    $Results = foreach ($Member in $GroupMembers) {
        $CurrentIndex++
        
        # Display progress in CLI
        $PercentComplete = [Math]::Round(($CurrentIndex / $TotalCount) * 100)
        Write-Progress -Activity "Auditing Active Directory" -Status "Checking: $($Member.Name) ($CurrentIndex of $TotalCount)" -PercentComplete $PercentComplete

        try {
            # 3. Fetch detailed properties
            # We use -ErrorAction Stop per-user to catch permission issues or deleted objects during the run
            $User = Get-ADUser -Identity $Member.distinguishedName -Properties State, StreetAddress, PhysicalDeliveryOfficeName, Description, Title, EmailAddress, Department -ErrorAction Stop

            # 4. Apply Filters
            # Safely handle potential null values in AD fields
            $StateVal = if ($User.State) { $User.State } else { "" }
            $StreetVal = if ($User.StreetAddress) { $User.StreetAddress } else { "" }
            $OfficeVal = if ($User.PhysicalDeliveryOfficeName) { $User.PhysicalDeliveryOfficeName } else { "" }
            $DescVal = if ($User.Description) { $User.Description } else { "" }
            $TitleVal = if ($User.Title) { $User.Title } else { "" }

            $LocationString = "$StateVal $StreetVal $OfficeVal"
            $IsInGeorgia = $LocationString -match "Georgia|\bGA\b|Atlanta"
            
            # Check if "Remote" appears in Description or Job Title
            $IsRemote = ($DescVal -like "*$ExcludeKeyword*") -or ($TitleVal -like "*$ExcludeKeyword*")

            if ($IsInGeorgia -and -not $IsRemote) {
                # Create a custom object for the CSV output
                [PSCustomObject]@{
                    DisplayName    = $User.DisplayName
                    SamAccountName = $User.SamAccountName
                    JobTitle       = $TitleVal
                    Department     = $User.Department
                    Email          = $User.EmailAddress
                    Office         = $OfficeVal
                    Address        = $StreetVal
                    State          = $StateVal
                    Description    = $DescVal
                }
            }
        } catch {
            Write-Warning "Failed to retrieve properties for user '$($Member.Name)'. This might be due to permissions or the account being deleted recently."
            continue # Move to the next user
        }
    }

    # 5. Export to CSV
    if ($Results) {
        try {
            $Results | Export-Csv -Path $OutputFile -NoTypeInformation -Encoding UTF8 -ErrorAction Stop
            Write-Host "`nSuccess! Found $($Results.Count) employees matching criteria." -ForegroundColor Green
            Write-Host "Results saved to: $((Get-Item $OutputFile).FullName)" -ForegroundColor Yellow
        } catch {
            Write-Error "Failed to write CSV file. Ensure the file isn't open in Excel and you have write permissions to the directory."
        }
    } else {
        Write-Warning "`nNo employees matched the criteria (Georgia/Atlanta/GA residents, non-remote)."
    }

} catch {
    Write-Error "A critical error occurred: $($_.Exception.Message)"
} finally {
    # Ensure the progress bar clears when the script finishes or fails
    Write-Progress -Activity "Auditing Active Directory" -Completed
}