"""
OTP Service for email-based OTP delivery
"""
import os
import random
import string
import logging
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


class OTPService:
    """Email-based OTP service"""

    def __init__(self):
        self.smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', 587))
        self.smtp_user = os.environ.get('SMTP_USER')
        self.smtp_password = os.environ.get('SMTP_PASSWORD')
        self.sender_name = os.environ.get('SMTP_SENDER_NAME', 'VGLUG Training Program')

    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return bool(self.smtp_user and self.smtp_password)

    def generate_otp(self, length: int = 6) -> str:
        """Generate a random numeric OTP"""
        return ''.join(random.choices(string.digits, k=length))

    def validate_email(self, email: str) -> Tuple[bool, Optional[str]]:
        """
        Validate email address format
        Returns (is_valid, error_message)
        """
        email = email.strip().lower()

        # Basic email format validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return False, 'Invalid email format'

        # Check for common typos
        if '..' in email or email.startswith('.') or '@.' in email:
            return False, 'Invalid email format'

        return True, None

    def normalize_email(self, email: str) -> str:
        """Normalize email to lowercase and strip whitespace"""
        return email.strip().lower()

    def send_otp(self, email: str, otp: str) -> Tuple[bool, Optional[str]]:
        """
        Send OTP via email
        Returns (success, error_message)
        """
        if not self.is_configured():
            logger.warning('Email OTP service not configured - SMTP credentials missing')
            return False, 'Email service not configured'

        email = self.normalize_email(email)

        # Validate email
        is_valid, error = self.validate_email(email)
        if not is_valid:
            return False, error

        try:
            # Create email message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f'Your VGLUG Application OTP: {otp}'
            msg['From'] = f'{self.sender_name} <{self.smtp_user}>'
            msg['To'] = email

            # Plain text version
            text_content = f"""
Your OTP for VGLUG Training Program Application

Your verification code is: {otp}

This code is valid for 5 minutes. Do not share this code with anyone.

If you did not request this code, please ignore this email.

---
VGLUG Training Program
https://vglug.org
            """

            # HTML version
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #00BAED; margin: 0;">VGLUG Training Program</h2>
        <p style="color: #666; margin: 5px 0 0 0;">Email Verification</p>
    </div>

    <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 20px;">
        <p style="margin: 0 0 15px 0; color: #666;">Your verification code is:</p>
        <div style="background: #00BAED; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 30px; border-radius: 8px; display: inline-block;">
            {otp}
        </div>
        <p style="margin: 15px 0 0 0; color: #999; font-size: 14px;">Valid for 5 minutes</p>
    </div>

    <div style="color: #666; font-size: 14px;">
        <p style="margin: 0 0 10px 0;">If you did not request this code, please ignore this email.</p>
        <p style="margin: 0; color: #999;">Do not share this code with anyone.</p>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <div style="text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 0;">VGLUG Training Program</p>
        <p style="margin: 5px 0 0 0;">https://vglug.org</p>
    </div>
</body>
</html>
            """

            msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_content, 'html'))

            # Send email
            logger.info(f'Sending OTP to {email[:3]}***@{email.split("@")[1]}')

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.smtp_user, email, msg.as_string())

            logger.info(f'OTP sent successfully to {email[:3]}***@{email.split("@")[1]}')
            return True, None

        except smtplib.SMTPAuthenticationError:
            logger.error('SMTP authentication failed')
            return False, 'Email service authentication failed'
        except smtplib.SMTPRecipientsRefused:
            logger.error(f'Recipient refused: {email}')
            return False, 'Invalid email address'
        except smtplib.SMTPException as e:
            logger.error(f'SMTP error: {str(e)}')
            return False, 'Failed to send email'
        except Exception as e:
            logger.error(f'Unexpected error sending OTP email: {str(e)}')
            return False, 'Failed to send OTP'


# Singleton instance
otp_service = OTPService()
