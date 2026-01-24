import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

# Email configuration from environment variables
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def send_email(
    to_email: str, 
    subject: str, 
    html_content: str, 
    text_content: Optional[str] = None,
    smtp_server: Optional[str] = None,
    smtp_port: Optional[int] = None,
    smtp_username: Optional[str] = None,
    smtp_password: Optional[str] = None,
    from_email: Optional[str] = None
) -> bool:
    """
    Send an email using SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML content of the email
        text_content: Plain text content (optional)
        smtp_server: SMTP server (optional, uses env/config if not provided)
        smtp_port: SMTP port (optional, uses env/config if not provided)
        smtp_username: SMTP username (optional, uses env/config if not provided)
        smtp_password: SMTP password (optional, uses env/config if not provided)
        from_email: From email address (optional, uses env/config if not provided)
    
    Returns:
        True if email sent successfully, False otherwise
    """
    # Use provided config or fall back to environment variables
    server = smtp_server or SMTP_SERVER
    port = smtp_port or SMTP_PORT
    username = smtp_username or SMTP_USERNAME
    password = smtp_password or SMTP_PASSWORD
    from_addr = from_email or FROM_EMAIL
    
    try:
        if not username or not password:
            print(f"Email not configured. Would send email to {to_email} with subject: {subject}")
            print(f"Email content:\n{html_content}")
            return True  # Return True for development when email is not configured
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_addr
        msg['To'] = to_email
        
        # Add plain text version if provided
        if text_content:
            part1 = MIMEText(text_content, 'plain')
            msg.attach(part1)
        
        # Add HTML version
        part2 = MIMEText(html_content, 'html')
        msg.attach(part2)
        
        # Send email
        with smtplib.SMTP(server, port) as smtp_server:
            smtp_server.starttls()
            smtp_server.login(username, password)
            smtp_server.send_message(msg)
        
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Error sending email to {to_email}: {str(e)}")
        return False

def send_registration_confirmation_email(
    email: str, 
    name: str, 
    verification_token: str,
    frontend_url: Optional[str] = None,
    **email_kwargs
) -> bool:
    """Send email confirmation link after registration"""
    from urllib.parse import quote
    frontend = frontend_url or FRONTEND_URL
    # Properly URL encode the token
    encoded_token = quote(verification_token, safe='')
    verification_url = f"{frontend}/verify-email?token={encoded_token}"
    
    subject = "Welcome to Vanatvam - Please Confirm Your Email"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Vanatvam!</h1>
            </div>
            <div class="content">
                <p>Dear {name},</p>
                <p>Thank you for registering with Vanatvam Property Booking System!</p>
                <p>Please confirm your email address by clicking the button below:</p>
                <p style="text-align: center;">
                    <a href="{verification_url}" class="button">Confirm Email Address</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #007bff;">{verification_url}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>© 2024 Vanatvam. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Welcome to Vanatvam!
    
    Dear {name},
    
    Thank you for registering with Vanatvam Property Booking System!
    
    Please confirm your email address by visiting this link:
    {verification_url}
    
    This link will expire in 24 hours.
    
    If you didn't create an account, please ignore this email.
    
    © 2024 Vanatvam. All rights reserved.
    """
    
    return send_email(email, subject, html_content, text_content, **email_kwargs)

def send_email_verified_notification(email: str, name: str, **email_kwargs) -> bool:
    """Send notification email after email verification"""
    subject = "Vanatvam - Email Verified Successfully"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .success {{ color: #27ae60; font-weight: bold; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✓ Email Verified!</h1>
            </div>
            <div class="content">
                <p>Dear {name},</p>
                <p class="success">Your email address has been successfully verified!</p>
                <p>Your registration request has been submitted and is now pending admin approval.</p>
                <p>You will receive another email notification once an administrator reviews and approves your account.</p>
                <p>Thank you for your patience!</p>
            </div>
            <div class="footer">
                <p>© 2024 Vanatvam. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Email Verified Successfully!
    
    Dear {name},
    
    Your email address has been successfully verified!
    
    Your registration request has been submitted and is now pending admin approval.
    You will receive another email notification once an administrator reviews and approves your account.
    
    Thank you for your patience!
    
    © 2024 Vanatvam. All rights reserved.
    """
    
    return send_email(email, subject, html_content, text_content, **email_kwargs)

def send_approval_email(
    email: str, 
    name: str, 
    property_name: str, 
    weekday_quota: int, 
    weekend_quota: int,
    frontend_url: Optional[str] = None,
    **email_kwargs
) -> bool:
    """Send email when admin approves user"""
    subject = "Vanatvam - Account Approved!"
    frontend = frontend_url or FRONTEND_URL
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .success {{ color: #27ae60; font-weight: bold; font-size: 18px; }}
            .info-box {{ background: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #27ae60; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Account Approved!</h1>
            </div>
            <div class="content">
                <p>Dear {name},</p>
                <p class="success">Great news! Your account has been approved by the administrator.</p>
                <div class="info-box">
                    <p><strong>Property Assignment:</strong> {property_name}</p>
                    <p><strong>Weekday Quota:</strong> {weekday_quota} credits</p>
                    <p><strong>Weekend Quota:</strong> {weekend_quota} credits</p>
                </div>
                <p>You can now log in to your account and start booking properties!</p>
                <p style="text-align: center;">
                    <a href="{frontend}/login" class="button">Login to Your Account</a>
                </p>
                <p>If you have any questions, please contact the administrator.</p>
            </div>
            <div class="footer">
                <p>© 2024 Vanatvam. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Account Approved!
    
    Dear {name},
    
    Great news! Your account has been approved by the administrator.
    
    Property Assignment: {property_name}
    Weekday Quota: {weekday_quota} credits
    Weekend Quota: {weekend_quota} credits
    
    You can now log in to your account and start booking properties!
    Login at: {frontend}/login
    
    If you have any questions, please contact the administrator.
    
    © 2024 Vanatvam. All rights reserved.
    """
    
    return send_email(email, subject, html_content, text_content, **email_kwargs)

def send_rejection_email(email: str, name: str, reason: Optional[str] = None, **email_kwargs) -> bool:
    """Send email when admin rejects user"""
    subject = "Vanatvam - Registration Update"
    
    reason_text = f"<p><strong>Reason:</strong> {reason}</p>" if reason else ""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .info-box {{ background: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e74c3c; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Registration Update</h1>
            </div>
            <div class="content">
                <p>Dear {name},</p>
                <p>Thank you for your interest in joining Vanatvam Property Booking System.</p>
                <p>Unfortunately, your registration request could not be approved at this time.</p>
                {reason_text}
                <p>If you believe this is an error or have any questions, please contact the administrator.</p>
                <p>We appreciate your understanding.</p>
            </div>
            <div class="footer">
                <p>© 2024 Vanatvam. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Registration Update
    
    Dear {name},
    
    Thank you for your interest in joining Vanatvam Property Booking System.
    
    Unfortunately, your registration request could not be approved at this time.
    
    {f'Reason: {reason}' if reason else ''}
    
    If you believe this is an error or have any questions, please contact the administrator.
    
    We appreciate your understanding.
    
    © 2024 Vanatvam. All rights reserved.
    """
    
    return send_email(email, subject, html_content, text_content, **email_kwargs)

