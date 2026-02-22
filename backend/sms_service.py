"""
SMS Service for OTP delivery via Fast2SMS
"""
import os
import random
import string
import requests
import logging
from datetime import datetime, timedelta
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


class SMSService:
    """Fast2SMS integration for sending OTP messages"""

    def __init__(self):
        self.api_key = os.environ.get('FAST2SMS_API_KEY')
        self.sender_id = os.environ.get('FAST2SMS_SENDER_ID', 'VGLUG')
        self.template_id = os.environ.get('FAST2SMS_TEMPLATE_ID')
        self.base_url = 'https://www.fast2sms.com/dev/bulkV2'
        self.otp_route_url = 'https://www.fast2sms.com/dev/otp'

    def is_configured(self) -> bool:
        """Check if SMS service is properly configured"""
        return bool(self.api_key)

    def generate_otp(self, length: int = 6) -> str:
        """Generate a random numeric OTP"""
        return ''.join(random.choices(string.digits, k=length))

    def validate_phone(self, phone: str) -> Tuple[bool, Optional[str]]:
        """
        Validate Indian mobile phone number
        Returns (is_valid, error_message)
        """
        # Remove any spaces or dashes
        phone = phone.replace(' ', '').replace('-', '')

        # Remove country code if present
        if phone.startswith('+91'):
            phone = phone[3:]
        elif phone.startswith('91') and len(phone) == 12:
            phone = phone[2:]
        elif phone.startswith('0'):
            phone = phone[1:]

        # Check if it's exactly 10 digits
        if not phone.isdigit():
            return False, 'Phone number must contain only digits'

        if len(phone) != 10:
            return False, 'Phone number must be 10 digits'

        # Check if it starts with valid Indian mobile prefix (6-9)
        if phone[0] not in '6789':
            return False, 'Invalid Indian mobile number'

        return True, None

    def normalize_phone(self, phone: str) -> str:
        """Normalize phone number to 10 digits"""
        phone = phone.replace(' ', '').replace('-', '')
        if phone.startswith('+91'):
            phone = phone[3:]
        elif phone.startswith('91') and len(phone) == 12:
            phone = phone[2:]
        elif phone.startswith('0'):
            phone = phone[1:]
        return phone

    def send_otp(self, phone: str, otp: str) -> Tuple[bool, Optional[str]]:
        """
        Send OTP via Fast2SMS
        Returns (success, error_message)
        """
        if not self.is_configured():
            logger.warning('SMS service not configured - API key missing')
            return False, 'SMS service not configured'

        phone = self.normalize_phone(phone)

        # Validate phone
        is_valid, error = self.validate_phone(phone)
        if not is_valid:
            return False, error

        try:
            # Use Fast2SMS Quick OTP route for simplicity
            # This is the simplest way to send OTP without DLT template
            headers = {
                'authorization': self.api_key,
                'Content-Type': 'application/json'
            }

            # Try OTP route first (simpler, works without DLT)
            otp_payload = {
                'variables_values': otp,
                'route': 'otp',
                'numbers': phone
            }

            logger.info(f'Sending OTP to {phone[:4]}****{phone[-2:]}')

            response = requests.post(
                self.otp_route_url,
                json=otp_payload,
                headers=headers,
                timeout=30
            )

            result = response.json()
            logger.info(f'Fast2SMS response: {result}')

            if result.get('return'):
                logger.info(f'OTP sent successfully to {phone[:4]}****{phone[-2:]}')
                return True, None
            else:
                error_msg = result.get('message', 'Failed to send OTP')
                logger.error(f'Fast2SMS error: {error_msg}')
                return False, error_msg

        except requests.exceptions.Timeout:
            logger.error('Fast2SMS request timed out')
            return False, 'SMS service timeout'
        except requests.exceptions.RequestException as e:
            logger.error(f'Fast2SMS request error: {str(e)}')
            return False, 'SMS service error'
        except Exception as e:
            logger.error(f'Unexpected error sending OTP: {str(e)}')
            return False, 'Failed to send OTP'

    def send_otp_dlt(self, phone: str, otp: str) -> Tuple[bool, Optional[str]]:
        """
        Send OTP via Fast2SMS DLT route (requires registered template)
        Use this for production with registered DLT template
        Returns (success, error_message)
        """
        if not self.is_configured():
            return False, 'SMS service not configured'

        if not self.template_id:
            return False, 'DLT template ID not configured'

        phone = self.normalize_phone(phone)

        try:
            headers = {
                'authorization': self.api_key,
                'Content-Type': 'application/x-www-form-urlencoded'
            }

            payload = {
                'route': 'dlt',
                'sender_id': self.sender_id,
                'message': self.template_id,
                'variables_values': otp,
                'flash': 0,
                'numbers': phone
            }

            response = requests.post(
                self.base_url,
                data=payload,
                headers=headers,
                timeout=30
            )

            result = response.json()

            if result.get('return'):
                logger.info(f'OTP sent via DLT to {phone[:4]}****{phone[-2:]}')
                return True, None
            else:
                error_msg = result.get('message', 'Failed to send OTP')
                logger.error(f'Fast2SMS DLT error: {error_msg}')
                return False, error_msg

        except Exception as e:
            logger.error(f'Error sending OTP via DLT: {str(e)}')
            return False, 'Failed to send OTP'


# Singleton instance
sms_service = SMSService()
