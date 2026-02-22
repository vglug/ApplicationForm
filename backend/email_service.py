"""
Email Service for sending verification emails to candidates.
Supports SMTP with basic email validation.
"""
import smtplib
import os
import re
import socket
import dns.resolver
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import datetime
from typing import Tuple, Optional


def get_logo_path() -> str:
    """Get the path to VGLUG logo"""
    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'images', 'vglug.png')
    if os.path.exists(logo_path):
        return logo_path
    return None


class EmailService:
    """Service for sending emails with SMTP"""

    def __init__(self):
        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_user = os.getenv('SMTP_USER', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('FROM_EMAIL', self.smtp_user)
        self.from_name = os.getenv('FROM_NAME', 'VGLUG Training Program')

    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return bool(self.smtp_user and self.smtp_password)

    def validate_email(self, email: str) -> Tuple[bool, Optional[str]]:
        """
        Validate email address format and check if domain has MX records.

        Returns:
            Tuple of (is_valid: bool, error_message: Optional[str])
        """
        # Basic format validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return False, f"Invalid email format: {email}"

        # Extract domain
        domain = email.split('@')[1]

        # Check for MX records (indicates domain can receive email)
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            if not mx_records:
                return False, f"Domain {domain} has no MX records - cannot receive email"
        except dns.resolver.NXDOMAIN:
            return False, f"Domain {domain} does not exist"
        except dns.resolver.NoAnswer:
            return False, f"Domain {domain} has no MX records"
        except dns.resolver.NoNameservers:
            return False, f"No DNS servers available for {domain}"
        except Exception as e:
            # DNS check failed but email format is valid - allow sending
            # This prevents blocking valid emails due to temporary DNS issues
            pass

        return True, None

    def send_verification_email(
        self,
        to_email: str,
        candidate_name: str,
        candidate_id: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Send verification email to candidate.

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        if not self.is_configured():
            return False, "Email service not configured. Set SMTP_USER and SMTP_PASSWORD environment variables."

        # Validate email address before attempting to send
        is_valid, validation_error = self.validate_email(to_email)
        if not is_valid:
            return False, f"Email validation failed: {validation_error}"

        try:
            # Create message with 'related' for embedded images
            msg = MIMEMultipart('related')
            msg['Subject'] = f'VGLUG Training Program - Application Received ({candidate_id})'
            msg['From'] = f'{self.from_name} <{self.from_email}>'
            msg['To'] = to_email

            # Create alternative part for text/html
            msg_alternative = MIMEMultipart('alternative')
            msg.attach(msg_alternative)

            # Plain text version
            text_content = f"""
Dear {candidate_name},

Thank you for submitting your application to the VGLUG Training Program.

Your Application ID: {candidate_id}

We have received your application and it is currently under review. You will be notified of the next steps via email and WhatsApp.

Please keep this Application ID safe for future reference.

Important:
- Do not reply to this email
- For queries, contact us through our official channels

Best regards,
VGLUG Training Program Team
            """.strip()

            # Check if logo exists
            logo_path = get_logo_path()
            logo_html = ''
            if logo_path:
                # Use CID reference for embedded image
                logo_html = '<img src="cid:vglug_logo" alt="VGLUG Logo" style="width: 80px; height: 80px; margin-bottom: 15px; border-radius: 50%; background: white; padding: 5px;">'

            # HTML version
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #00BAED, #0099cc); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }}
        .app-id {{ background: #e7f7ff; border: 2px solid #00BAED; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; }}
        .app-id-label {{ font-size: 12px; color: #666; text-transform: uppercase; }}
        .app-id-value {{ font-size: 24px; font-weight: bold; color: #00BAED; letter-spacing: 2px; }}
        .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #888; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            {logo_html}
            <h1 style="margin: 0;">VGLUG Training Program</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Application Confirmation</p>
        </div>
        <div class="content">
            <p>Dear <strong>{candidate_name}</strong>,</p>

            <p>Thank you for submitting your application to the VGLUG Training Program.</p>

            <div class="app-id">
                <div class="app-id-label">Your Application ID</div>
                <div class="app-id-value">{candidate_id}</div>
            </div>

            <p>We have received your application and it is currently under review. You will be notified of the next steps via email and WhatsApp.</p>

            <p><strong>Please keep this Application ID safe for future reference.</strong></p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

            <p style="font-size: 13px; color: #666;">
                <strong>Note:</strong> This is an automated message. Please do not reply to this email.
            </p>
        </div>
        <div class="footer">
            <p>&copy; {datetime.now().year} VGLUG Training Program. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
            """.strip()

            # Attach text and HTML to alternative part
            msg_alternative.attach(MIMEText(text_content, 'plain'))
            msg_alternative.attach(MIMEText(html_content, 'html'))

            # Attach logo image with CID
            if logo_path:
                with open(logo_path, 'rb') as f:
                    logo_image = MIMEImage(f.read())
                    logo_image.add_header('Content-ID', '<vglug_logo>')
                    logo_image.add_header('Content-Disposition', 'inline', filename='vglug_logo.png')
                    msg.attach(logo_image)

            # Connect and send
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)

                # Send email
                refused = server.sendmail(self.from_email, [to_email], msg.as_string())

                if refused:
                    return False, f"Email refused by server: {refused}"

            return True, None

        except smtplib.SMTPRecipientsRefused as e:
            # Email bounced - recipient rejected
            return False, f"Email bounced: {str(e)}"

        except smtplib.SMTPAuthenticationError as e:
            return False, f"SMTP authentication failed: {str(e)}"

        except smtplib.SMTPException as e:
            return False, f"SMTP error: {str(e)}"

        except Exception as e:
            return False, f"Failed to send email: {str(e)}"

    def send_bulk_verification_emails(
        self,
        candidates: list,
        batch_size: int = 50
    ) -> dict:
        """
        Send verification emails to multiple candidates.

        Args:
            candidates: List of dicts with 'email', 'name', 'candidate_id'
            batch_size: Number of emails to send in one SMTP session

        Returns:
            Dict with 'success', 'failed', 'errors' lists
        """
        results = {
            'success': [],
            'failed': [],
            'errors': {}
        }

        if not self.is_configured():
            for c in candidates:
                results['failed'].append(c['candidate_id'])
                results['errors'][c['candidate_id']] = "Email service not configured"
            return results

        for candidate in candidates:
            success, error = self.send_verification_email(
                to_email=candidate['email'],
                candidate_name=candidate['name'],
                candidate_id=candidate['candidate_id']
            )

            if success:
                results['success'].append(candidate['candidate_id'])
            else:
                results['failed'].append(candidate['candidate_id'])
                results['errors'][candidate['candidate_id']] = error

        return results


# Singleton instance
email_service = EmailService()
