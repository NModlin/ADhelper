# 📧 Email Integration for New User Credentials

**Version:** 1.0.0
**Last Updated:** 2026-02-09
**Status:** Current
**Related Docs:** [README.md](../README.md)

## ✅ Overview

The ADHelper application now automatically sends new user credentials to the employee's manager via email when a new user account is created. This feature includes:

- ✅ Professional HTML email template with Rehrig Pacific branding
- ✅ Automatic email delivery to manager
- ✅ Secure password transmission
- ✅ Password change requirement at first login
- ✅ Security best practices and warnings
- ✅ Email delivery status tracking

---

## 🎨 Email Template Features

### **Professional Design**
- Rehrig Pacific branding (Electric Blue gradient header)
- Responsive HTML layout
- Clean, modern typography
- Mobile-friendly design

### **Security Information Included**
- ⚠️ Password change required at first login
- 🔒 Secure delivery instructions
- 🚫 Do not forward warning
- 🗑️ Delete after use reminder

### **Credentials Display**
- Employee name
- Email address
- Temporary password (highlighted in yellow box)
- Account creation date and time

### **Next Steps for Employee**
1. Log in with provided credentials
2. Create new secure password
3. Complete onboarding tasks
4. Contact IT if issues arise

---

## 📁 Files Created

### 1. **Email Template** (`email-templates/NewUserCredentials.html`)
- Professional HTML email template
- Rehrig Pacific branding
- Placeholders for dynamic content:
  - `{{EMPLOYEE_NAME}}`
  - `{{EMAIL_ADDRESS}}`
  - `{{TEMP_PASSWORD}}`
  - `{{CREATION_DATE}}`
  - `{{CURRENT_YEAR}}`

### 2. **Email Functions** (`scripts/Send-NewUserEmail.ps1`)
- `Send-NewUserCredentialEmail` - Sends formatted email to manager
- `Get-ManagerEmailFromDN` - Retrieves manager email from AD

### 3. **Updated Files**
- `src/main/main.ts` - Integrated email sending into user creation
- `src/renderer/pages/ADHelper.tsx` - Added email status display

---

## 🔧 How It Works

### **User Creation Flow:**

```
1. User fills out new user form
   ↓
2. Click "Create User" button
   ↓
3. PowerShell creates AD user account
   ↓
4. Password change at logon = TRUE ✅
   ↓
5. If manager DN provided:
   - Retrieve manager email from AD
   - Load HTML email template
   - Replace placeholders with actual data
   - Send email via SMTP
   ↓
6. Display result in UI with email status
```

### **Email Sending Process:**

```powershell
# 1. Get manager email from DN
$managerEmail = Get-ManagerEmailFromDN -ManagerDN $managerDN -Credential $cred

# 2. Prepare email parameters
$emailParams = @{
  EmployeeName = "John Smith"
  EmailAddress = "jsmith@rehrig.com"
  TempPassword = "TempPass123!"
  ManagerEmail = "manager@rehrig.com"
  CreationDate = "February 09, 2026 at 02:30 PM"
}

# 3. Send email
Send-NewUserCredentialEmail @emailParams
```

---

## ⚙️ SMTP Configuration

### **Default Settings:**
- **SMTP Server:** `smtp.office365.com`
- **Port:** `587`
- **SSL:** Enabled
- **From Address:** `noreply-adhelper@rehrig.com`

### **Credentials:**
The email function looks for SMTP credentials in Windows Credential Manager:

1. **Primary:** `ADHelper_SMTP_Cred` (dedicated SMTP credentials)
2. **Fallback:** `ADHelper_AdminCred` (admin credentials)

### **To Configure SMTP Credentials:**

```powershell
# Option 1: Use Settings page in ADHelper app
# Navigate to Settings → Configure SMTP Credentials

# Option 2: Use PowerShell
cmdkey /generic:ADHelper_SMTP_Cred /user:smtp-user@rehrig.com /pass:YourPassword
```

---

## 🎯 UI Features

### **Email Status Indicators:**

1. **✅ Email Sent Successfully**
   - Green alert with checkmark
   - Shows manager email address
   - Confirms delivery

2. **⚠️ Email Delivery Failed**
   - Yellow warning alert
   - Shows attempted manager email
   - Instructs to provide credentials manually

3. **ℹ️ No Manager Email**
   - Blue info alert
   - Manager DN provided but no email found
   - Instructs manual delivery

4. **ℹ️ No Manager Specified**
   - Blue info alert
   - No manager DN provided during creation
   - Instructs to provide password to employee

---

## 🔐 Security Features

### **Password Security:**
- ✅ 12-character random password
- ✅ Mixed case, numbers, and symbols
- ✅ Password change required at first login
- ✅ Secure transmission via encrypted email (TLS/SSL)

### **Email Security:**
- ✅ Sent via encrypted SMTP (TLS)
- ✅ Includes security warnings
- ✅ Instructs manager to delete after use
- ✅ Warns against forwarding

### **Best Practices Included:**
- 🔒 Provide credentials through secure channel
- 🚫 Do not forward email
- 🗑️ Delete email after providing credentials
- 👤 Deliver credentials in person when possible

---

## 📋 Testing Checklist

- [ ] Create user with manager DN
- [ ] Verify email sent to manager
- [ ] Check email formatting and branding
- [ ] Verify all placeholders replaced correctly
- [ ] Test with invalid manager DN
- [ ] Test without manager DN
- [ ] Verify password change required at login
- [ ] Test SMTP credential fallback
- [ ] Verify email status displayed in UI
- [ ] Test in both light and dark modes

---

## 🚀 Deployment Steps

### **1. Configure SMTP Credentials**
```powershell
# Store SMTP credentials in Windows Credential Manager
cmdkey /generic:ADHelper_SMTP_Cred /user:your-smtp-user@rehrig.com /pass:YourPassword
```

### **2. Verify Email Template**
- Ensure `email-templates/NewUserCredentials.html` exists
- Verify Rehrig branding is correct
- Test email rendering in email clients

### **3. Update SMTP Settings (if needed)**
Edit `scripts/Send-NewUserEmail.ps1`:
```powershell
SmtpServer = "your-smtp-server.com"  # Update if different
Port = 587  # Update if different
From = "noreply-adhelper@rehrig.com"  # Update if different
```

### **4. Test Email Delivery**
- Create test user with manager
- Verify email received
- Check spam/junk folders
- Verify formatting

---

## 🔍 Troubleshooting

### **Email Not Sending:**
1. Check SMTP credentials in Credential Manager
2. Verify SMTP server and port settings
3. Check firewall rules for port 587
4. Verify sender email address is allowed

### **Manager Email Not Found:**
1. Verify manager DN is correct format
2. Check manager has EmailAddress or UserPrincipalName in AD
3. Verify AD credentials have read permissions

### **Email Goes to Spam:**
1. Add sender to safe senders list
2. Configure SPF/DKIM records for domain
3. Use authenticated SMTP server

---

## 📊 Email Template Preview

**Subject:** New User Account Created: John Smith

**Header:** Electric Blue gradient with "New User Account Created"

**Body:**
- Greeting
- Employee credentials (name, email, password, date)
- Security warnings (yellow box)
- Next steps for employee
- IT contact information

**Footer:** Rehrig Pacific Company branding

---

## ✅ Summary

**Status:** ✅ Fully Integrated and Ready for Testing  
**Security:** ✅ Password change required at first login  
**Email:** ✅ Professional template with Rehrig branding  
**Delivery:** ✅ Automatic to manager with status tracking  

The email integration provides a secure, professional way to deliver new user credentials to managers while maintaining security best practices and Rehrig Pacific branding standards.

