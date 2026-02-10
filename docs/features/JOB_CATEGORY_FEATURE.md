# Job Category Selection Feature - Implementation Complete

## Overview
The Job Category Selection feature allows site-specific job profiles to be assigned to new users during account creation. When a user selects a site location (e.g., Orlando) that has configured job profiles, they can choose from predefined job categories, each with its own set of Active Directory groups.

## Key Features

### 1. **Site-Specific Job Profiles**
- Job profiles are configured per site location
- Each job profile has a category name and a list of AD groups
- Currently implemented for Orlando site with 4 job categories

### 2. **Automatic Group Deduplication**
- Merges standard groups + site groups + job profile groups
- Removes duplicates by comparing Distinguished Names (DN)
- Case-insensitive comparison after URL-decoding (e.g., `%20` → space)
- Prevents duplicate group memberships

### 3. **Visual Group Preview**
- Shows standard groups (10 default groups)
- Shows site-specific groups (blue chips)
- Shows job profile groups (green chips)
- Displays total group count with deduplication note

## Orlando Job Categories

### 1. ORL Standard User (Production)
**Groups:** 11 groups including:
- Password Policy - Standard User No Expiration
- All_Employees
- AMOrlando
- OR PAC Unrestricted
- OR PAC MDF
- Orlando
- ProductionOrlando
- RehrigVPN
- RehrigVPN_Distro
- US Employees
- Orlando Global

### 2. ORL Engineering
**Groups:** 15 groups including:
- All_Employees
- AMOrlando
- GeneralDistribution
- Intune User Enrollment
- OR PAC Unrestricted
- OR PAC MDF
- Orlando
- ProductionOrlando
- RehrigVPN
- RehrigVPN_Distro
- US Employees
- Orlando Global
- EngineeringOrlando
- OPSMFG Reports
- Orlando Data

### 3. ORL Production Supervisor
**Groups:** 15 groups including:
- All_Employees
- AMOrlando
- GeneralDistribution
- Intune User Enrollment
- OR PAC Unrestricted
- OR PAC MDF
- Orlando
- ProductionOrlando
- RehrigVPN
- RehrigVPN_Distro
- US Employees
- Orlando Global
- SCPSupervisorOrlando
- OPSMFG Reports
- Orlando Data

### 4. Shipping (Supervisor/Manager)
**Groups:** 6 groups including:
- AMOrlando
- Help Desk Access
- NVR OR Cameras Read
- orlando_supplies
- RehrigVPN
- RehrigVPN_Distro

## Technical Implementation

### Architecture
```
Frontend (React) → IPC Layer → Main Process → PowerShell Backend
     ↓                ↓              ↓                ↓
  UI State      electronAPI    IPC Handler    Add-UserToStandardGroups
```

### Data Flow
1. User selects site location (e.g., "Orlando")
2. Frontend loads job profiles for that site from `job-profiles.json`
3. User selects job category (optional)
4. Frontend extracts group DNs from selected job profile
5. Frontend passes `jobProfileGroups` array to backend via IPC
6. Backend passes groups to PowerShell as separate parameter
7. PowerShell merges all groups and deduplicates
8. PowerShell adds user to final deduplicated group list

### Storage Structure
**File:** `{userData}/job-profiles.json`

```json
{
  "orlando": [
    {
      "category": "ORL Standard User (Production)",
      "groups": [
        {
          "name": "Password Policy - Standard User No Expiration",
          "distinguishedName": "CN=Password%20Policy%20-%20Standard%20User%20No%20Expiration,OU=Security%20Groups,DC=RPL,DC=Local"
        }
      ]
    }
  ]
}
```

## Files Modified

### Frontend
- ✅ `src/renderer/pages/ADHelper.tsx` - Added job profile state, UI, and user creation logic
- ✅ `src/renderer/components/JobProfileManagement.tsx` - Created management UI component
- ✅ `src/renderer/electronAPI.ts` - Added job profile API methods

### IPC Layer
- ✅ `src/preload/preload.ts` - Exposed job profile methods to renderer

### Backend
- ✅ `src/main/main.ts` - Added IPC handlers and user creation integration
- ✅ `ADhelper.ps1` - Updated `Add-UserToStandardGroups` with deduplication logic

### Data
- ✅ `orlando-job-profiles.json` - Complete Orlando job profile data

## Usage Instructions

### For Administrators

#### 1. Configure Job Profiles for a Site
1. Navigate to Settings → Site Management
2. Select a site (e.g., Orlando)
3. Click "Manage Job Profiles"
4. Add job profiles with format:
   ```
   GroupName|DistinguishedName
   ```
   One per line

#### 2. Create User with Job Category
1. Navigate to AD Helper → Create New User
2. Fill in user details
3. Select site location (e.g., "Orlando")
4. Select job category (e.g., "ORL Engineering")
5. Review group preview showing all groups to be added
6. Click "Create User"

### For Developers

#### Adding Job Profiles for Other Sites
1. Create job profile data in JSON format
2. Use `electronAPI.saveJobProfiles(siteId, jobProfiles)` to save
3. Job profiles will automatically appear when that site is selected

## Deduplication Logic

### PowerShell Implementation
```powershell
# Merge all groups
$allGroupsRaw = $standardGroups + $AdditionalGroups + $JobProfileGroups

# Deduplicate by URL-decoded, case-insensitive DN
$uniqueGroups = @{}
foreach ($groupDN in $allGroupsRaw) {
    $decodedDN = [System.Web.HttpUtility]::UrlDecode($groupDN).ToLower()
    if (-not $uniqueGroups.ContainsKey($decodedDN)) {
        $uniqueGroups[$decodedDN] = $groupDN
    }
}
$allGroups = $uniqueGroups.Values
```

### Example
**Before Deduplication:**
- 10 standard groups
- 3 site groups (1 duplicate with standard)
- 11 job profile groups (2 duplicates with standard, 1 with site)

**After Deduplication:**
- Total: 20 unique groups (10 + 2 + 8)
- Duplicates removed: 4

## Default Settings

### New User OU
All new users are created in: `OU=Rehrig,OU=Accounts,DC=RPL,DC=Local`

This is the default organizational unit for all Rehrig Pacific employees.

## Testing Checklist

- [ ] Load job profiles when Orlando site is selected
- [ ] Job category dropdown appears and populates correctly
- [ ] Selecting different job categories updates group preview
- [ ] User creation with job profile groups succeeds
- [ ] Deduplication works correctly (check PowerShell output)
- [ ] Verify users are created in correct OU (OU=Rehrig,OU=Accounts,DC=RPL,DC=Local)
- [ ] Test combinations:
  - [ ] Orlando + no job category
  - [ ] Orlando + ORL Standard User (Production)
  - [ ] Orlando + ORL Engineering
  - [ ] Orlando + ORL Production Supervisor
  - [ ] Orlando + Shipping (Supervisor/Manager)
- [ ] Verify total group count is correct after deduplication

## Future Enhancements

1. **Multi-Site Support:** Add job profiles for other sites (Atlanta, Dallas, etc.)
2. **Job Profile Templates:** Create reusable templates for common job categories
3. **Bulk Import:** Import job profiles from CSV or Excel
4. **Group Validation:** Verify all groups exist in AD before saving
5. **Audit Logging:** Track which job profiles are assigned to users

---

**Status:** ✅ **IMPLEMENTATION COMPLETE**  
**Version:** 1.0  
**Last Updated:** 2026-02-09

