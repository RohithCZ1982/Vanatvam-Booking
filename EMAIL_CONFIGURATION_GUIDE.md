# Email Configuration Guide for Vanatvam Booking System

This guide explains how to configure email settings for user registration, login verification, and other email notifications.

## Overview

The system sends emails for:
- **Registration Confirmation**: Sent when a new user registers
- **Email Verification**: Sent after user verifies their email
- **Account Approval**: Sent when admin approves a user account
- **Account Rejection**: Sent when admin rejects a user registration

## Configuration Methods

### Method 1: Admin UI Configuration (Recommended)

1. **Login as Admin**
   - Access the admin dashboard
   - Navigate to **Settings** → **Email Configuration**

2. **Configure SMTP Settings**
   - Fill in the following fields:
     - **SMTP Server**: Your email provider's SMTP server
     - **SMTP Port**: Usually 587 (TLS) or 465 (SSL)
     - **SMTP Username**: Your email address
     - **SMTP Password**: Your email password or App Password
     - **From Email**: The email address that will appear as sender
     - **Frontend URL**: Your application URL (e.g., http://localhost:3000)
     - **Enabled**: Toggle to enable/disable email sending

3. **Save Configuration**
   - Click "Save Configuration"
   - Test the configuration using the "Send Test Email" button

### Method 2: Environment Variables (Alternative)

Create a `.env` file in the `backend` directory:

```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FRONTEND_URL=http://localhost:3000
```

## Email Provider Specific Instructions

### Gmail Configuration

1. **Enable 2-Step Verification**
   - Go to your Google Account settings
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Generate and copy the 16-character password

3. **Configure in Admin Panel**
   - **SMTP Server**: `smtp.gmail.com`
   - **SMTP Port**: `587` (TLS) or `465` (SSL)
   - **SMTP Username**: Your Gmail address
   - **SMTP Password**: The 16-character App Password (not your regular password)
   - **From Email**: Your Gmail address

### Outlook/Hotmail Configuration

1. **SMTP Settings**
   - **SMTP Server**: `smtp-mail.outlook.com`
   - **SMTP Port**: `587`
   - **SMTP Username**: Your Outlook email
   - **SMTP Password**: Your Outlook password
   - **From Email**: Your Outlook email

### Yahoo Mail Configuration

1. **SMTP Settings**
   - **SMTP Server**: `smtp.mail.yahoo.com`
   - **SMTP Port**: `587` or `465`
   - **SMTP Username**: Your Yahoo email
   - **SMTP Password**: Your Yahoo password (or App Password)
   - **From Email**: Your Yahoo email

### Custom SMTP Server

For custom SMTP servers (like SendGrid, Mailgun, etc.):

1. **Get SMTP Credentials**
   - Check your email service provider's documentation
   - Obtain SMTP server, port, username, and password

2. **Configure in Admin Panel**
   - Enter the provided SMTP details
   - Use the recommended port (usually 587 for TLS)

## Email Templates

You can customize email templates in:
- **Settings** → **Email Configuration** → **Email Templates** tab

Available templates:
- **Registration**: Sent when user registers
- **Verification**: Sent after email verification
- **Approval**: Sent when admin approves account
- **Rejection**: Sent when admin rejects registration

## Testing Email Configuration

1. **Use Test Email Feature**
   - In Email Configuration, click "Send Test Email"
   - Enter a test email address
   - Check if the email is received

2. **Test Registration Flow**
   - Register a new user account
   - Check email inbox for confirmation email
   - Click verification link
   - Verify email is received

## Troubleshooting

### Emails Not Sending

1. **Check Configuration**
   - Verify all SMTP settings are correct
   - Ensure "Enabled" toggle is ON
   - Check if email service is enabled in admin panel

2. **Check Logs**
   - Check backend console for error messages
   - Look for SMTP connection errors

3. **Common Issues**
   - **Gmail**: Must use App Password, not regular password
   - **Port Issues**: Try port 587 (TLS) or 465 (SSL)
   - **Firewall**: Ensure SMTP ports are not blocked
   - **Credentials**: Double-check username and password

### Email Goes to Spam

1. **SPF/DKIM Records**
   - Configure SPF and DKIM records for your domain
   - Use a verified sender email address

2. **Email Content**
   - Avoid spam trigger words
   - Include proper unsubscribe links
   - Use proper email formatting

## Security Best Practices

1. **Use App Passwords**
   - Never use your main email password
   - Generate app-specific passwords

2. **Environment Variables**
   - Store sensitive credentials in `.env` file
   - Never commit `.env` to version control

3. **Regular Updates**
   - Update passwords regularly
   - Monitor email sending logs

## Email Flow for New Users

1. **User Registers** → Receives registration confirmation email
2. **User Clicks Verification Link** → Email verified
3. **User Receives Verification Notification** → Email verified successfully
4. **Admin Approves Account** → User receives approval email
5. **User Can Now Login** → Login with verified credentials

## Support

For issues or questions:
- Check backend logs for detailed error messages
- Verify SMTP settings with your email provider
- Test with a simple email client first
