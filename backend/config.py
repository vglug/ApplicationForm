import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://sathish:sathish4043@localhost:5432/training_data')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'change-me')
    JWT_IDENTITY_CLAIM = 'sub'

    # Fast2SMS Configuration for OTP
    FAST2SMS_API_KEY = os.getenv('FAST2SMS_API_KEY')
    FAST2SMS_SENDER_ID = os.getenv('FAST2SMS_SENDER_ID', 'VGLUG')
    FAST2SMS_TEMPLATE_ID = os.getenv('FAST2SMS_TEMPLATE_ID')  # For DLT route
