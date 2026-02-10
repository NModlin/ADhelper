# 📍 Site Configuration Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-09
**Status:** Current
**Related Docs:** [README.md](../README.md)

## Overview

This guide will help you configure the site locations for the ADHelper application. Each site location can have its own set of Active Directory groups that will be automatically added to new users at that location.

---

## 🏢 Pre-Defined Site Locations

Based on your requirements, here are the site locations that should be configured:

1. **Atlanta**
2. **Buckeye**
3. **Dallas**
4. **Erie**
5. **Kenosha**
6. **Kansas**
7. **Orlando**
8. **Remote**
9. **RSO**

---

## 📋 How to Configure Each Site

### Step 1: Open Settings

1. Launch ADHelper application
2. Navigate to **Settings** page (gear icon in sidebar)
3. Scroll to **Site Location Management** section

### Step 2: Add a New Site

1. Click **"Add Site"** button
2. Enter the **Site Name** (e.g., "Orlando Plant", "Buckeye Office", etc.)
3. Enter **AD Group DNs** (one per line)
4. Click **"Add Site"** to save

---

## 🔍 Finding AD Group DNs

To find the Distinguished Name (DN) of an Active Directory group, use PowerShell:

```powershell
# Connect to AD
$credential = Get-Credential

# Search for a group
Get-ADGroup -Filter "Name -like '*Orlando*'" -Credential $credential | Select-Object Name, DistinguishedName

# Example output:
# Name                    DistinguishedName
# ----                    -----------------
# Orlando_Employees       CN=Orlando_Employees,OU=Security Groups,DC=RPL,DC=Local
# Orlando_Building_Access CN=Orlando_Building_Access,OU=Security Groups,DC=RPL,DC=Local
```

---

## 📝 Example Site Configuration Format

When configuring a site, use this format:

**Site Name:** `[Location Name]`

**AD Group DNs:** (one per line)
```
CN=[GroupName],OU=[OrganizationalUnit],DC=RPL,DC=Local
CN=[GroupName],OU=[OrganizationalUnit],DC=RPL,DC=Local
CN=[GroupName],OU=[OrganizationalUnit],DC=RPL,DC=Local
```

**Note:** The actual group names and OUs will depend on your Active Directory structure. Use the PowerShell commands below to find the correct DNs for your site-specific groups.

---

## ⚙️ Configuration Template

Use this template to plan your site configurations:

### Atlanta
- **Site Name:** `Atlanta`
- **Groups:**
  - [ ] `CN=Atlanta_Employees,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] `CN=Atlanta_Building_Access,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] Add more as needed...

### Buckeye
- **Site Name:** `Buckeye`
- **Groups:**
  - [ ] `CN=Buckeye_Employees,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] `CN=Buckeye_Building_Access,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] Add more as needed...

### Dallas
- **Site Name:** `Dallas`
- **Groups:**
  - [ ] `CN=Dallas_Employees,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] `CN=Dallas_Building_Access,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] Add more as needed...

### Erie
- **Site Name:** `Erie`
- **Groups:**
  - [ ] `CN=Erie_Employees,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] `CN=Erie_Building_Access,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] Add more as needed...

### Kenosha
- **Site Name:** `Kenosha`
- **Groups:**
  - [ ] `CN=Kenosha_Employees,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] `CN=Kenosha_Building_Access,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] Add more as needed...

### Kansas
- **Site Name:** `Kansas`
- **Groups:**
  - [ ] `CN=Kansas_Employees,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] `CN=Kansas_Building_Access,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] Add more as needed...

### Orlando
- **Site Name:** `Orlando`
- **Groups:**
  - [ ] `CN=Orlando_Employees,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] `CN=Orlando_Building_Access,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] Add more as needed...

### Remote
- **Site Name:** `Remote`
- **Groups:**
  - [ ] `CN=Remote_Workers,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] `CN=VPN_Full_Access,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] Add more as needed...

### RSO
- **Site Name:** `RSO`
- **Groups:**
  - [ ] `CN=RSO_Employees,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] `CN=RSO_Building_Access,OU=Security Groups,DC=RPL,DC=Local`
  - [ ] Add more as needed...

---

## 🔧 Tips & Best Practices

1. **Use Descriptive Names:** Make site names clear and recognizable (e.g., "Orlando Plant" instead of just "Orlando")

2. **Verify Group DNs:** Always verify group DNs exist in Active Directory before adding them

3. **Test First:** Create a test user with each site location to verify groups are added correctly

4. **Document Groups:** Keep a record of which groups are assigned to each site for future reference

5. **Regular Updates:** Review and update site configurations as organizational needs change

---

## ❓ Troubleshooting

### Groups Not Being Added

**Problem:** Site-specific groups are not being added to new users

**Solutions:**
- Verify the group DN is correct (copy/paste from AD)
- Check that the group exists in Active Directory
- Ensure you have permissions to add users to the group
- Review the PowerShell output for error messages

### Site Not Appearing in Dropdown

**Problem:** Configured site doesn't appear in user creation dialog

**Solutions:**
- Refresh the page
- Verify the site was saved successfully in Settings
- Check browser console for errors
- Restart the application

---

## 📞 Support

If you encounter issues configuring sites:

1. Check the PowerShell output in the terminal for detailed error messages
2. Verify your AD credentials have permission to add users to groups
3. Test with a single group first before adding multiple groups
4. Review the `SITE_LOCATION_FEATURE_COMPLETE.md` for technical details

---

**Happy Configuring!** 🎉

