# Organize-Documentation.ps1
# Organizes all documentation files, adds metadata headers, and creates index

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

# Define documentation categories and their files
$docCategories = @{
    "features" = @(
        "JOB_CATEGORY_FEATURE.md",
        "SITE_LOCATION_FEATURE_COMPLETE.md",
        "AD_CONNECTION_STATUS_FEATURE.md",
        "EMAIL_FEATURE_SUMMARY.md",
        "MANUAL_MANAGER_EMAIL_FEATURE.md",
        "MFA_AND_USER_CREATION_FEATURES.md",
        "TERMINAL_VIEWER_FEATURE.md",
        "ADHELPER_ADVANCED_FEATURES.md"
    )
    "guides" = @(
        "GETTING_STARTED.md",
        "HOW_TO_RUN.md",
        "QUICK_START.md",
        "SITE_CONFIGURATION_GUIDE.md",
        "EMAIL_INTEGRATION_GUIDE.md",
        "STORED_CREDENTIALS_GUIDE.md",
        "DEPLOYMENT_CHECKLIST.md",
        "VOICE_COMMANDS_GUIDE.md"
    )
    "technical" = @(
        "CREDENTIAL_STORE_IMPLEMENTATION.md",
        "PARALLEL_PROCESSING_GUIDE.md",
        "STANDARD_GROUPS_REFERENCE.md"
    )
    "ui-ux" = @(
        "REHRIG_BRAND_UI_GUIDE.md",
        "REHRIG_BRAND_SUMMARY.md",
        "OFFICIAL_REHRIG_COLORS.md",
        "UI_MODERNIZATION_SUMMARY.md",
        "UI_MODERNIZATION_CODE_EXAMPLES.md",
        "UI_MODERNIZATION_QUICK_REFERENCE.md",
        "UI_UX_MODERNIZATION_PLAN.md",
        "BEFORE_AFTER_COMPARISON.md"
    )
    "status" = @(
        "DOCUMENTATION_AUDIT_REPORT.md",
        "APP_SUMMARY.md",
        "IMPLEMENTATION_SUMMARY.md",
        "IMPLEMENTATION_COMPLETE.md",
        "INTEGRATION_COMPLETE.md",
        "TASKS_COMPLETED_SUMMARY.md",
        "TRANSFORMATION_SUMMARY.md",
        "ADHELPER_COMBINED_STATUS.md",
        "CREDENTIAL_SYSTEM_STATUS.md",
        "VERIFICATION_REPORT.md",
        "ELECTRON_APP_TEST_REPORT.md",
        "BROWSER_TEST_SUMMARY.md"
    )
    "archive" = @(
        "ADHELPER_IMPROVEMENTS_BRAINSTORM.md"
    )
}

# Technical docs that need line number disclaimers
$technicalDocs = @(
    "CREDENTIAL_STORE_IMPLEMENTATION.md",
    "PARALLEL_PROCESSING_GUIDE.md",
    "STANDARD_GROUPS_REFERENCE.md",
    "INTEGRATION_COMPLETE.md",
    "AD_CONNECTION_STATUS_FEATURE.md",
    "JOB_CATEGORY_FEATURE.md"
)

# Metadata template
$metadataTemplate = @"
**Version:** {VERSION}
**Last Updated:** {DATE}
**Status:** {STATUS}
**Related Docs:** {RELATED}

"@

$lineNumberDisclaimer = @"
> **⚠️ Note on Line Numbers:** Line numbers referenced in this document are approximate and may change as the codebase evolves. Use them as general guidance rather than exact references. When in doubt, search for function names or code patterns instead.

"@

Write-Host "=== ADHelper Documentation Organization Script ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] No files will be modified" -ForegroundColor Yellow
    Write-Host ""
}

# Function to add metadata to a file
function Add-Metadata {
    param(
        [string]$FilePath,
        [string]$Category,
        [bool]$IsTechnical
    )
    
    $fileName = Split-Path $FilePath -Leaf
    $content = Get-Content $FilePath -Raw
    
    # Skip if already has metadata
    if ($content -match '\*\*Version:\*\*') {
        Write-Host "  [SKIP] Already has metadata: $fileName" -ForegroundColor Yellow
        return $false
    }
    
    # Extract title from first line
    $firstLine = ($content -split "`n")[0]
    $title = $firstLine -replace '^#\s*', '' -replace '^\s*', ''
    
    # Determine version and status
    $version = "1.0.0"
    $status = "Current"
    $date = Get-Date -Format "yyyy-MM-dd"
    
    # Determine related docs based on category
    $related = switch ($Category) {
        "features" { "[README.md](../README.md), [Getting Started](../guides/GETTING_STARTED.md)" }
        "guides" { "[README.md](../README.md)" }
        "technical" { "[README.md](../README.md), [Implementation Complete](../status/IMPLEMENTATION_COMPLETE.md)" }
        "ui-ux" { "[Rehrig Brand UI Guide](REHRIG_BRAND_UI_GUIDE.md), [Official Colors](OFFICIAL_REHRIG_COLORS.md)" }
        "status" { "[README.md](../README.md), [App Summary](APP_SUMMARY.md)" }
        default { "[README.md](../README.md)" }
    }
    
    # Build new content
    $metadata = $metadataTemplate -replace '\{VERSION\}', $version `
                                   -replace '\{DATE\}', $date `
                                   -replace '\{STATUS\}', $status `
                                   -replace '\{RELATED\}', $related
    
    $newContent = $firstLine + "`n`n" + $metadata
    
    # Add line number disclaimer for technical docs
    if ($IsTechnical) {
        $newContent += $lineNumberDisclaimer
    }
    
    # Add rest of content (skip first line)
    $restOfContent = ($content -split "`n", 2)[1]
    $newContent += $restOfContent
    
    if (-not $DryRun) {
        Set-Content -Path $FilePath -Value $newContent -NoNewline
    }
    
    Write-Host "  [UPDATED] Added metadata: $fileName" -ForegroundColor Green
    return $true
}

Write-Host "Step 1: Adding metadata to documentation files..." -ForegroundColor Cyan
$updatedCount = 0

foreach ($category in $docCategories.Keys) {
    Write-Host "`nCategory: $category" -ForegroundColor Magenta

    foreach ($file in $docCategories[$category]) {
        $filePath = Join-Path $PSScriptRoot "..\$file"

        if (Test-Path $filePath) {
            $isTechnical = $technicalDocs -contains $file
            $updated = Add-Metadata -FilePath $filePath -Category $category -IsTechnical $isTechnical
            if ($updated) { $updatedCount++ }
        } else {
            Write-Host "  [NOT FOUND] $file" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Files updated with metadata: $updatedCount" -ForegroundColor Green

if ($DryRun) {
    Write-Host "`n[DRY RUN COMPLETE] Run without -DryRun to apply changes" -ForegroundColor Yellow
} else {
    Write-Host "`n[COMPLETE] Documentation metadata added successfully!" -ForegroundColor Green
}

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Run Move-Documentation.ps1 to organize files into folders" -ForegroundColor White
Write-Host "2. Run Verify-Documentation.ps1 to check documentation health" -ForegroundColor White

