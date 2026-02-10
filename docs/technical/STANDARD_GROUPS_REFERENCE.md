# 📋 Standard Groups Reference

**Version:** 1.0.0
**Last Updated:** 2026-02-09
**Status:** Current
**Related Docs:** [README.md](../README.md), [Implementation Complete](../status/IMPLEMENTATION_COMPLETE.md)
> **⚠️ Note on Line Numbers:** Line numbers referenced in this document are approximate and may change as the codebase evolves. Use them as general guidance rather than exact references. When in doubt, search for function names or code patterns instead.

**Last Updated:** 2026-02-09  
**Source:** `ADhelper.ps1` (lines 11-22)  
**Total Count:** 10 groups

---

## 🎯 Overview

All new users created through ADHelper are automatically added to **10 standard employee groups** in Active Directory. These groups provide baseline access, security policies, and distribution lists for Rehrig Pacific employees.

---

## 📊 Complete List of Standard Groups

### 1. **All_Employees**
- **Distinguished Name:** `CN=All_Employees,OU=Adaxes%20Managed,OU=Security%20Groups,DC=RPL,DC=Local`
- **Type:** Security Group
- **Purpose:** Universal group for all Rehrig Pacific employees
- **Managed By:** Adaxes

### 2. **US Employees (Distribution List)**
- **Distinguished Name:** `CN=US%20Employees,OU=Distribution%20Lists,DC=RPL,DC=Local`
- **Type:** Distribution List
- **Purpose:** Email distribution for all US-based employees
- **Managed By:** IT Department

### 3. **USEmployees (Security Group)**
- **Distinguished Name:** `CN=USEmployees,OU=Adaxes%20Managed,OU=Security%20Groups,DC=RPL,DC=Local`
- **Type:** Security Group
- **Purpose:** Security group for US-based employees
- **Managed By:** Adaxes

### 4. **Password Policy - Standard User No Expiration**
- **Distinguished Name:** `CN=Password%20Policy%20-%20Standard%20User%20No%20Expiration,OU=Security%20Groups,DC=RPL,DC=Local`
- **Type:** Security Group
- **Purpose:** Applies password policy without expiration for standard users
- **Managed By:** IT Department

### 5. **Intune User Enrollment**
- **Distinguished Name:** `CN=Intune%20User%20Enrollment,OU=Security%20Groups,DC=RPL,DC=Local`
- **Type:** Security Group
- **Purpose:** Enables Microsoft Intune device enrollment for users
- **Managed By:** IT Department

### 6. **Help Desk Access**
- **Distinguished Name:** `CN=Help%20Desk%20Access,OU=Security%20Groups,DC=RPL,DC=Local`
- **Type:** Security Group
- **Purpose:** Provides access to help desk resources and tools
- **Managed By:** IT Department

### 7. **RehrigVPN**
- **Distinguished Name:** `CN=RehrigVPN,OU=Mgr-Owner-Approval-Required,OU=Self%20Service%20Groups,DC=RPL,DC=Local`
- **Type:** Security Group
- **Purpose:** Grants VPN access to Rehrig Pacific network
- **Managed By:** Self Service (Manager/Owner Approval Required)

### 8. **RehrigVPN_Distro**
- **Distinguished Name:** `CN=RehrigVPN_Distro,OU=Distribution%20Lists,DC=RPL,DC=Local`
- **Type:** Distribution List
- **Purpose:** Email distribution for VPN users
- **Managed By:** IT Department

### 9. **GeneralDistribution**
- **Distinguished Name:** `CN=GeneralDistribution,OU=Distribution%20Lists,DC=RPL,DC=Local`
- **Type:** Distribution List
- **Purpose:** General company-wide email distribution
- **Managed By:** IT Department

### 10. **Selfservice**
- **Distinguished Name:** `CN=Selfservice,OU=Security%20Groups,DC=RPL,DC=Local`
- **Type:** Security Group
- **Purpose:** Provides access to self-service tools and portals
- **Managed By:** IT Department

---

## 🔧 Technical Details

### PowerShell Array Definition
```powershell
$standardGroups = @(
    "CN=All_Employees,OU=Adaxes%20Managed,OU=Security%20Groups,DC=RPL,DC=Local",
    "CN=US%20Employees,OU=Distribution%20Lists,DC=RPL,DC=Local",
    "CN=USEmployees,OU=Adaxes%20Managed,OU=Security%20Groups,DC=RPL,DC=Local",
    "CN=Password%20Policy%20-%20Standard%20User%20No%20Expiration,OU=Security%20Groups,DC=RPL,DC=Local",
    "CN=Intune%20User%20Enrollment,OU=Security%20Groups,DC=RPL,DC=Local",
    "CN=Help%20Desk%20Access,OU=Security%20Groups,DC=RPL,DC=Local",
    "CN=RehrigVPN,OU=Mgr-Owner-Approval-Required,OU=Self%20Service%20Groups,DC=RPL,DC=Local",
    "CN=RehrigVPN_Distro,OU=Distribution%20Lists,DC=RPL,DC=Local",
    "CN=GeneralDistribution,OU=Distribution%20Lists,DC=RPL,DC=Local",
    "CN=Selfservice,OU=Security%20Groups,DC=RPL,DC=Local"
)
```

### URL Encoding
Note that some group DNs contain URL-encoded characters:
- `%20` = Space character
- Example: `US%20Employees` = "US Employees"

---

## 📍 Additional Groups

### Site-Specific Groups
In addition to the 10 standard groups, users may be added to **site-specific groups** based on their location:
- Orlando Plant
- Atlanta Office
- Dallas Office
- Buckeye Office
- Erie Office
- Kenosha Office
- Kansas Office
- Remote Workers
- RSO (Regional Sales Office)

See `SITE_LOCATION_FEATURE_COMPLETE.md` for details.

### Job Profile Groups
Users at specific sites (e.g., Orlando) may also be added to **job profile groups** based on their role:
- ORL Standard User (Production)
- ORL Engineering
- ORL Production Supervisor
- Shipping (Supervisor/Manager)

See `JOB_CATEGORY_FEATURE.md` for details.

---

## 🔄 Group Deduplication

When site-specific groups and job profile groups are added, ADHelper automatically **deduplicates** groups by comparing Distinguished Names (case-insensitive, URL-decoded) to prevent duplicate memberships.

**Example:**
- Standard groups: 10
- Site groups: 3 (1 duplicate with standard)
- Job profile groups: 11 (2 duplicates with standard, 1 with site)
- **Total unique groups:** 20 (10 + 2 + 8)

---

## ✅ Verification

To verify a user has been added to all standard groups:

```powershell
Get-ADUser -Identity "username" -Properties MemberOf | 
    Select-Object -ExpandProperty MemberOf | 
    Where-Object { $standardGroups -contains $_ }
```

---

## 📚 Related Documentation

- `ADhelper.ps1` - PowerShell script with group definitions
- `SITE_LOCATION_FEATURE_COMPLETE.md` - Site-specific groups
- `JOB_CATEGORY_FEATURE.md` - Job profile groups
- `README.md` - General ADHelper documentation

