import os
import json
import uuid
import logging
from logging.handlers import RotatingFileHandler
import traceback
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, create_access_token, verify_jwt_in_request, get_jwt_identity, jwt_required
from functools import wraps
from io import BytesIO
import qrcode
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from sqlalchemy import func

from config import Config
from models import db, User, Submission, FormConfig, ValidationSchema, Application, BasicInfo, EducationalInfo, FamilyInfo, IncomeInfo, CourseInfo, Widget, EmailQueue, OTPVerification, EditToken
from helpers import save_normalized_application
from widget_query_builder import get_widget_metadata, execute_widget_query, get_widget_candidate_ids, get_widget_segment_candidate_ids


# Role-based access control decorators
def require_role(*allowed_roles):
    """Decorator to require specific roles for an endpoint"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user_id = int(get_jwt_identity())
            user = User.query.get(user_id)

            if not user:
                return jsonify({'msg': 'User not found'}), 401

            if user.role not in allowed_roles:
                return jsonify({'msg': 'Access denied. Insufficient permissions'}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def admin_required(f):
    """Decorator for admin-only endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 401

        if not user.is_admin():
            return jsonify({'msg': 'Admin access required'}), 403

        return f(*args, **kwargs)
    return decorated_function


def can_view_applications(f):
    """Decorator for endpoints that allow viewing applications (all roles)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 401

        if not user.can_view_applications():
            return jsonify({'msg': 'Access denied'}), 403

        return f(*args, **kwargs)
    return decorated_function


def can_edit_applications(f):
    """Decorator for endpoints that allow editing applications (admin and panel_member)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 401

        if not user.can_edit_applications():
            return jsonify({'msg': 'Access denied. Edit permission required'}), 403

        return f(*args, **kwargs)
    return decorated_function


def send_edit_link_email(email, name, edit_link, candidate_id):
    """Send edit link email to user"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    sender_name = os.environ.get('SMTP_SENDER_NAME', 'VGLUG Training Program')
    from_email = os.environ.get('FROM_EMAIL', smtp_user)

    if not smtp_user or not smtp_password:
        return False, 'Email service not configured'

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Edit Your VGLUG Application'
        msg['From'] = f'{sender_name} <{from_email}>'
        msg['To'] = email

        text_content = f"""
Hello {name},

You requested to edit your VGLUG Training Program application.

Click the link below to edit your application:
{edit_link}

This link is valid for 6 hours and can only be used once.

Application ID: {candidate_id}

If you did not request this, please ignore this email.

---
VGLUG Training Program
https://vglug.org
        """

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
        <p style="color: #666; margin: 5px 0 0 0;">Edit Your Application</p>
    </div>

    <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
        <p style="margin: 0 0 15px 0;">Hello <strong>{name}</strong>,</p>
        <p style="margin: 0 0 20px 0;">You requested to edit your VGLUG Training Program application.</p>

        <div style="text-align: center; margin: 25px 0;">
            <a href="{edit_link}" style="background: #00BAED; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; display: inline-block;">Edit My Application</a>
        </div>

        <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">
            <strong>Application ID:</strong> {candidate_id}<br>
            <strong>Link valid for:</strong> 6 hours
        </p>
    </div>

    <div style="color: #666; font-size: 14px;">
        <p style="margin: 0 0 10px 0;">If the button doesn't work, copy and paste this link:</p>
        <p style="margin: 0 0 15px 0; word-break: break-all; color: #00BAED;">{edit_link}</p>
        <p style="margin: 0; color: #999;">If you did not request this, please ignore this email.</p>
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

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, email, msg.as_string())

        return True, None

    except smtplib.SMTPAuthenticationError:
        return False, 'Email service authentication failed'
    except smtplib.SMTPRecipientsRefused:
        return False, 'Invalid email address'
    except smtplib.SMTPException as e:
        return False, f'Failed to send email: {str(e)}'
    except Exception as e:
        return False, f'Failed to send email: {str(e)}'


def setup_logging(app):
    """Configure rotating file logging for the application"""
    log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'application_logs')
    os.makedirs(log_dir, exist_ok=True)

    log_file = os.path.join(log_dir, 'app.log')

    # Rotating file handler: 10MB max per file, keep 5 backup files
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)

    # Log format
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(name)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)

    # Add handler to Flask app logger
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)

    # Also add to werkzeug logger (request logs)
    werkzeug_logger = logging.getLogger('werkzeug')
    werkzeug_logger.addHandler(file_handler)

    # Log startup
    app.logger.info('Application started - Logging initialized')


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Setup logging
    setup_logging(app)

    db.init_app(app)
    CORS(app,
         origins=['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5000', 'http://127.0.0.1:5001', 'http://localhost:5174'],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    Migrate(app, db)
    jwt = JWTManager(app)

    # JWT error handlers - ensure CORS headers are applied to error responses
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'msg': 'Token has expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'msg': 'Invalid token'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'msg': 'Missing authorization token'}), 401

    @jwt.token_verification_failed_loader
    def token_verification_failed_callback(jwt_header, jwt_payload):
        return jsonify({'msg': 'Token verification failed'}), 401

    with app.app_context():
        db.create_all()

    @app.route('/auth/register', methods=['POST'])
    def register():
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')
        if not email or not password:
            return jsonify({'msg':'email and password required'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'msg':'user exists'}), 400
        user = User(email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return jsonify({'msg':'registered'}), 201

    @app.route('/auth/login', methods=['POST'])
    def login():
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')
        if not email or not password:
            return jsonify({'msg':'email and password required'}), 400
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'msg':'invalid credentials'}), 401
        token = create_access_token(identity=str(user.id))
        return jsonify({'access_token': token}), 200

    @app.route('/form', methods=['GET'])
    def get_form():
        # Get active form configuration from database
        active_form = FormConfig.query.filter_by(is_active=True).order_by(FormConfig.year.desc(), FormConfig.version.desc()).first()

        if active_form:
            return jsonify(active_form.config_json), 200

        # Fallback to file if no active form in database
        path = os.path.join(os.path.dirname(__file__), '..', 'markdown', 'dynamic_form_json.json')
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            return jsonify(data), 200
        except Exception as e:
            return jsonify({'msg':'cannot load form', 'error': str(e)}), 500

    @app.route('/send-otp', methods=['POST'])
    def send_otp():
        """Send OTP to email for verification before form access"""
        try:
            from otp_service import otp_service
            from datetime import timedelta

            data = request.get_json() or {}
            email = data.get('email', '').strip()

            if not email:
                return jsonify({'success': False, 'message': 'Email address is required'}), 400

            # Validate and normalize email
            is_valid, error = otp_service.validate_email(email)
            if not is_valid:
                return jsonify({'success': False, 'message': error}), 400

            normalized_email = otp_service.normalize_email(email)

            # Rate limiting: Max 3 OTPs per email per 10 minutes
            ten_minutes_ago = datetime.utcnow() - timedelta(minutes=10)
            recent_otps = OTPVerification.query.filter(
                OTPVerification.email == normalized_email,
                OTPVerification.created_at > ten_minutes_ago
            ).count()

            if recent_otps >= 3:
                app.logger.warning(f'OTP rate limit exceeded for {normalized_email}')
                return jsonify({
                    'success': False,
                    'message': 'Too many OTP requests. Please try again after 10 minutes.'
                }), 429

            # Generate OTP
            otp_code = otp_service.generate_otp(6)

            # Get client IP for tracking
            client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
            if client_ip:
                client_ip = client_ip.split(',')[0].strip()

            # Create OTP record (expires in 5 minutes)
            otp_record = OTPVerification(
                email=normalized_email,
                otp_code=otp_code,
                expires_at=datetime.utcnow() + timedelta(minutes=5),
                ip_address=client_ip
            )
            db.session.add(otp_record)
            db.session.commit()

            # Send OTP via email
            success, error = otp_service.send_otp(normalized_email, otp_code)

            if success:
                app.logger.info(f'OTP sent successfully to {normalized_email}')
                return jsonify({
                    'success': True,
                    'message': 'OTP sent successfully to your email',
                    'email': normalized_email  # Return normalized email for frontend
                }), 200
            else:
                app.logger.error(f'Failed to send OTP to {normalized_email}: {error}')
                return jsonify({
                    'success': False,
                    'message': error or 'Failed to send OTP'
                }), 500

        except Exception as e:
            app.logger.error(f'Error in send_otp: {str(e)}')
            return jsonify({'success': False, 'message': 'Server error'}), 500

    @app.route('/verify-otp', methods=['POST'])
    def verify_otp():
        """Verify OTP and grant form access"""
        try:
            from otp_service import otp_service

            data = request.get_json() or {}
            email = data.get('email', '').strip()
            otp = data.get('otp', '').strip()

            if not email or not otp:
                return jsonify({'success': False, 'message': 'Email and OTP are required'}), 400

            normalized_email = otp_service.normalize_email(email)

            # Find the most recent unexpired OTP for this email
            otp_record = OTPVerification.query.filter(
                OTPVerification.email == normalized_email,
                OTPVerification.expires_at > datetime.utcnow(),
                OTPVerification.verified == False
            ).order_by(OTPVerification.created_at.desc()).first()

            if not otp_record:
                return jsonify({
                    'success': False,
                    'message': 'OTP expired or not found. Please request a new OTP.'
                }), 400

            # Check attempt limit (max 5 attempts)
            if otp_record.attempts >= 5:
                return jsonify({
                    'success': False,
                    'message': 'Too many failed attempts. Please request a new OTP.'
                }), 400

            # Increment attempts
            otp_record.attempts += 1
            db.session.commit()

            # Verify OTP
            if otp_record.otp_code != otp:
                remaining = 5 - otp_record.attempts
                return jsonify({
                    'success': False,
                    'message': f'Invalid OTP. {remaining} attempt(s) remaining.'
                }), 400

            # Mark as verified
            otp_record.verified = True
            db.session.commit()

            app.logger.info(f'OTP verified successfully for {normalized_email}')

            return jsonify({
                'success': True,
                'message': 'Email verified successfully',
                'verified_email': normalized_email
            }), 200

        except Exception as e:
            app.logger.error(f'Error in verify_otp: {str(e)}')
            return jsonify({'success': False, 'message': 'Server error'}), 500

    @app.route('/check-email', methods=['POST'])
    def check_email():
        """Check if email is already registered with an application"""
        try:
            from otp_service import otp_service

            data = request.get_json() or {}
            email = data.get('email', '').strip()

            if not email:
                return jsonify({'success': False, 'message': 'Email is required'}), 400

            normalized_email = otp_service.normalize_email(email)

            # Check if email exists in BasicInfo
            existing = BasicInfo.query.filter(
                func.lower(BasicInfo.email) == normalized_email
            ).first()

            if existing:
                return jsonify({
                    'success': True,
                    'registered': True,
                    'message': 'This email is already registered with an application.'
                }), 200
            else:
                return jsonify({
                    'success': True,
                    'registered': False
                }), 200

        except Exception as e:
            app.logger.error(f'Error in check_email: {str(e)}')
            return jsonify({'success': False, 'message': 'Server error'}), 500

    @app.route('/send-edit-link', methods=['POST'])
    def send_edit_link():
        """Send an edit link to a registered email"""
        try:
            from otp_service import otp_service
            from datetime import timedelta
            import secrets

            data = request.get_json() or {}
            email = data.get('email', '').strip()

            if not email:
                return jsonify({'success': False, 'message': 'Email is required'}), 400

            normalized_email = otp_service.normalize_email(email)

            # Find the application with this email
            basic_info = BasicInfo.query.filter(
                func.lower(BasicInfo.email) == normalized_email
            ).first()

            if not basic_info:
                return jsonify({
                    'success': False,
                    'message': 'No application found with this email'
                }), 404

            # Rate limiting: Max 3 edit links per email per hour
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            recent_tokens = EditToken.query.filter(
                EditToken.email == normalized_email,
                EditToken.created_at > one_hour_ago
            ).count()

            if recent_tokens >= 3:
                app.logger.warning(f'Edit link rate limit exceeded for {normalized_email}')
                return jsonify({
                    'success': False,
                    'message': 'Too many edit link requests. Please try again after an hour.'
                }), 429

            # Generate secure token
            token = secrets.token_urlsafe(32)

            # Get client IP for tracking
            client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
            if client_ip:
                client_ip = client_ip.split(',')[0].strip()

            # Create edit token (expires in 6 hours)
            edit_token = EditToken(
                token=token,
                candidate_id=basic_info.candidate_id,
                email=normalized_email,
                expires_at=datetime.utcnow() + timedelta(hours=6),
                ip_address=client_ip
            )
            db.session.add(edit_token)
            db.session.commit()

            # Build edit link URL
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
            edit_link = f"{frontend_url}/edit/{token}"

            # Send email with edit link
            success, error = send_edit_link_email(normalized_email, basic_info.full_name, edit_link, basic_info.candidate_id)

            if success:
                app.logger.info(f'Edit link sent to {normalized_email}')
                return jsonify({
                    'success': True,
                    'message': 'Edit link has been sent to your email. It is valid for 6 hours.'
                }), 200
            else:
                app.logger.error(f'Failed to send edit link to {normalized_email}: {error}')
                return jsonify({
                    'success': False,
                    'message': error or 'Failed to send edit link email'
                }), 500

        except Exception as e:
            app.logger.error(f'Error in send_edit_link: {str(e)}')
            return jsonify({'success': False, 'message': 'Server error'}), 500

    @app.route('/validate-edit-token/<token>', methods=['GET'])
    def validate_edit_token(token):
        """Validate edit token and return application data"""
        try:
            # Find the token
            edit_token = EditToken.query.filter_by(token=token).first()

            if not edit_token:
                return jsonify({
                    'success': False,
                    'message': 'Invalid edit link'
                }), 404

            # Check if expired
            if datetime.utcnow() > edit_token.expires_at:
                return jsonify({
                    'success': False,
                    'message': 'This edit link has expired. Please request a new one.'
                }), 400

            # Check if already used
            if edit_token.used:
                return jsonify({
                    'success': False,
                    'message': 'This edit link has already been used.'
                }), 400

            # Get application data
            application = Application.query.filter_by(candidate_id=edit_token.candidate_id).first()
            if not application:
                return jsonify({
                    'success': False,
                    'message': 'Application not found'
                }), 404

            # Build form data from normalized tables
            form_data = {}

            if application.basic_info:
                bi = application.basic_info
                form_data.update({
                    'full_name': bi.full_name,
                    'dob': bi.dob.isoformat() if bi.dob else None,
                    'gender': bi.gender,
                    'email': bi.email,
                    'differently_abled': bi.differently_abled,
                    'contact': bi.contact,
                    'contact_as_whatsapp': bi.contact_as_whatsapp,
                    'whatsapp_contact': bi.whatsapp_contact,
                    'has_laptop': bi.has_laptop,
                    'laptop_ram': bi.laptop_ram,
                    'laptop_processor': bi.laptop_processor
                })

            if application.educational_info:
                ei = application.educational_info
                form_data.update({
                    'college_name': ei.college_name,
                    'degree': ei.degree,
                    'department': ei.department,
                    'year': ei.year,
                    'tamil_medium': ei.tamil_medium,
                    '6_to_8_govt_school': ei.six_to_8_govt_school,
                    '6_to_8_school_name': ei.six_to_8_school_name,
                    '9_to_10_govt_school': ei.nine_to_10_govt_school,
                    '9_to_10_school_name': ei.nine_to_10_school_name,
                    '11_to_12_govt_school': ei.eleven_to_12_govt_school,
                    '11_to_12_school_name': ei.eleven_to_12_school_name,
                    'present_work': ei.present_work,
                    'received_scholarship': ei.received_scholarship,
                    'scholarship_details': ei.scholarship_details,
                    'transport_mode': ei.transport_mode,
                    'vglug_applied_before': ei.vglug_applied_before
                })

            if application.family_info:
                fi = application.family_info
                form_data.update({
                    'family_environment': fi.family_environment,
                    'single_parent_info': fi.single_parent_info,
                    'family_members_count': fi.family_members_count,
                    'family_members_details': fi.family_members_details,
                    'earning_members_count': fi.earning_members_count,
                    'earning_members_details': fi.earning_members_details,
                    'guardian_details': fi.guardian_details
                })

            if application.income_info:
                ii = application.income_info
                form_data.update({
                    'total_family_income': ii.total_family_income,
                    'own_land_size': ii.own_land_size,
                    'house_ownership': ii.house_ownership,
                    'full_address': ii.full_address,
                    'pincode': ii.pincode,
                    'district': ii.district
                })

            if application.course_info:
                ci = application.course_info
                form_data.update({
                    'preferred_course': ci.preferred_course,
                    'training_benefit': ci.training_benefit,
                    'heard_about_vglug': ci.heard_about_vglug,
                    'participated_in_vglug_events': ci.participated_in_vglug_events
                })

            return jsonify({
                'success': True,
                'candidate_id': edit_token.candidate_id,
                'email': edit_token.email,
                'form_data': form_data,
                'expires_at': edit_token.expires_at.isoformat()
            }), 200

        except Exception as e:
            app.logger.error(f'Error in validate_edit_token: {str(e)}')
            return jsonify({'success': False, 'message': 'Server error'}), 500

    @app.route('/update-application/<token>', methods=['PUT'])
    def update_application_via_token(token):
        """Update an existing application using edit token"""
        try:
            # Find and validate the token
            edit_token = EditToken.query.filter_by(token=token).first()

            if not edit_token:
                return jsonify({'success': False, 'message': 'Invalid edit link'}), 404

            if datetime.utcnow() > edit_token.expires_at:
                return jsonify({'success': False, 'message': 'This edit link has expired'}), 400

            if edit_token.used:
                return jsonify({'success': False, 'message': 'This edit link has already been used'}), 400

            # Get payload
            payload = request.get_json() or {}

            # Get application
            application = Application.query.filter_by(candidate_id=edit_token.candidate_id).first()
            if not application:
                return jsonify({'success': False, 'message': 'Application not found'}), 404

            # Update application data using helper function
            from helpers import update_normalized_application
            update_normalized_application(application.candidate_id, payload)

            # Mark token as used
            edit_token.used = True
            edit_token.used_at = datetime.utcnow()
            db.session.commit()

            app.logger.info(f'Application {edit_token.candidate_id} updated via edit link')

            return jsonify({
                'success': True,
                'message': 'Application updated successfully',
                'candidate_id': edit_token.candidate_id
            }), 200

        except Exception as e:
            app.logger.error(f'Error in update_application: {str(e)}')
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Server error'}), 500

    @app.route('/submit', methods=['POST'])
    def submit():
        try:
            payload = request.get_json() or {}
            app.logger.info(f"New application submission received")

            # Generate UUID and candidate ID
            submission_uuid = str(uuid.uuid4())
            now = datetime.utcnow()
            current_year = now.strftime('%Y')

            # Count applications for current year to generate sequential number starting from 1001
            count_year = Application.query.filter(
                Application.candidate_id.like(f'CID{current_year}%')
            ).count()

            candidate_id = f'CID{current_year}{count_year + 1001:04d}'

            # Get active form config
            active_form_config = FormConfig.query.filter_by(is_active=True).first()
            form_config_id = active_form_config.id if active_form_config else None

            # Save to normalized database structure
            application = save_normalized_application(
                structured_data=payload,
                candidate_id=candidate_id,
                uuid=submission_uuid,
                form_config_id=form_config_id
            )

            # Also save to legacy Submission table for backwards compatibility
            submission = Submission(
                uuid=submission_uuid,
                candidate_id=candidate_id,
                data=payload
            )
            db.session.add(submission)
            db.session.commit()

            # Queue verification email for background processing via Celery
            email_queued = False
            try:
                from email_service import email_service
                if email_service.is_configured() and application.basic_info and application.basic_info.email:
                    # Create email queue record
                    email_record = EmailQueue(
                        candidate_id=candidate_id,
                        to_email=application.basic_info.email,
                        recipient_name=application.basic_info.full_name,
                        email_type='verification',
                        status='pending'
                    )
                    db.session.add(email_record)
                    db.session.commit()

                    # Queue the Celery task
                    try:
                        from tasks import send_verification_email_task
                        send_verification_email_task.delay(email_record.id)
                        email_queued = True
                        app.logger.info(f"Email queued for {candidate_id} (queue_id: {email_record.id})")
                    except Exception as celery_error:
                        # Celery not available, fall back to direct send
                        app.logger.warning(f"Celery not available, sending directly: {str(celery_error)}")
                        success, error = email_service.send_verification_email(
                            to_email=application.basic_info.email,
                            candidate_name=application.basic_info.full_name,
                            candidate_id=candidate_id
                        )
                        email_record.status = 'sent' if success else 'failed'
                        email_record.sent_at = datetime.utcnow() if success else None
                        email_record.error_message = error if not success else None
                        if application.basic_info:
                            application.basic_info.email_sent_at = datetime.utcnow()
                            application.basic_info.email_verified = success
                            application.basic_info.email_verified_at = datetime.utcnow() if success else None
                            application.basic_info.email_error = error if not success else None
                        db.session.commit()
                        email_queued = success
            except Exception as e:
                # Don't fail the submission if email queueing fails
                app.logger.error(f"Email queue exception for {candidate_id}: {str(e)}")

            return jsonify({
                'msg': 'submitted',
                'id': application.id,
                'uuid': submission_uuid,
                'candidate_id': candidate_id,
                'email_queued': email_queued
            }), 201
        except Exception as e:
            app.logger.error(f"Submission error: {traceback.format_exc()}")
            return jsonify({'msg':'submission failed', 'error': str(e)}), 500

    @app.route('/download-pdf/<submission_uuid>', methods=['GET'])
    def download_pdf(submission_uuid):
        # Get from Application table (normalized structure)
        application = Application.query.filter_by(uuid=submission_uuid).first()
        if not application:
            return jsonify({'msg': 'Application not found'}), 404

        # Also get from Submission table for backward compatibility
        submission = Submission.query.filter_by(uuid=submission_uuid).first()

        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()

        # Blue and White Color Theme
        PRIMARY_COLOR = '#00BAED'  # Blue
        SECONDARY_COLOR = '#0095C8'  # Darker Blue
        ACCENT_COLOR = '#000000'  # Black
        LIGHT_BG = '#E7F7FF'  # Light blue background

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=22,
            textColor=colors.HexColor(PRIMARY_COLOR),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=15,
            textColor=colors.HexColor(SECONDARY_COLOR),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold',
            alignment=TA_CENTER
        )

        # Logo
        logo_path = os.path.join(os.path.dirname(__file__), 'assets', 'images', 'vglug.png')
        if os.path.exists(logo_path):
            logo_img = Image(logo_path, width=1.2*inch, height=1.2*inch)
            logo_table = Table([[logo_img]], colWidths=[2*inch])
            logo_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(logo_table)
            elements.append(Spacer(1, 0.2*inch))

        # Title
        elements.append(Paragraph('VGLUG APPLICATION FORM 2025', title_style))
        elements.append(Spacer(1, 0.2*inch))

        # Application Number
        app_num_style = ParagraphStyle(
            'AppNumber',
            parent=styles['Normal'],
            fontSize=16,
            textColor=colors.black,
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        elements.append(Paragraph(f'Candidate ID: {application.candidate_id}', app_num_style))
        elements.append(Spacer(1, 0.1*inch))

        # Generate QR Code
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(application.uuid)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")

        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)

        qr_image = Image(qr_buffer, width=1.5*inch, height=1.5*inch)

        # Create table for QR code (centered)
        qr_table = Table([[qr_image]], colWidths=[2*inch])
        qr_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(qr_table)
        elements.append(Spacer(1, 0.3*inch))

        # Form data from normalized tables
        basic = application.basic_info

        # Candidate Info Section with improved design
        elements.append(Paragraph('Candidate Information', heading_style))

        # Format date properly
        dob = basic.dob.strftime('%d %B %Y') if basic.dob else 'N/A'

        candidate_data = [
            ['Name', basic.full_name or 'N/A'],
            ['Date of Birth', dob],
            ['Gender', basic.gender or 'N/A'],
            ['Email', basic.email or 'N/A'],
            ['Contact Number', basic.contact or 'N/A'],
        ]

        candidate_table = Table(candidate_data, colWidths=[2.2*inch, 4.3*inch])
        candidate_table.setStyle(TableStyle([
            # Header column styling - using VGLUG maroon
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor(PRIMARY_COLOR)),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, -1), 11),
            # Data column styling
            ('BACKGROUND', (1, 0), (1, -1), colors.white),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (1, 0), (1, -1), 11),
            # Borders and spacing - using VGLUG red
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor(SECONDARY_COLOR)),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            # Alternating row colors for better readability
            ('ROWBACKGROUNDS', (1, 0), (1, -1), [colors.white, colors.HexColor(LIGHT_BG)]),
        ]))
        elements.append(candidate_table)
        elements.append(Spacer(1, 0.4*inch))

        # Footer
        footer_text = f"Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC"
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(footer_text, footer_style))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name=f'{application.candidate_id}.pdf',
            mimetype='application/pdf'
        )

    # Admin endpoints
    @app.route('/admin/login', methods=['POST'])
    def admin_login():
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'msg': 'Email and password required'}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'msg': 'Invalid credentials'}), 401

        # All roles (admin, volunteer, panel_member) can login to admin panel
        if user.role not in [User.ROLE_ADMIN, User.ROLE_VOLUNTEER, User.ROLE_PANEL_MEMBER]:
            return jsonify({'msg': 'Access denied. No valid role assigned'}), 403

        token = create_access_token(identity=str(user.id))
        return jsonify({
            'access_token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role
            }
        }), 200

    @app.route('/admin/form-configs', methods=['GET'])
    @admin_required
    def get_all_form_configs():
        configs = FormConfig.query.order_by(FormConfig.year.desc(), FormConfig.version.desc()).all()
        return jsonify([{
            'id': c.id,
            'year': c.year,
            'version': c.version,
            'is_active': c.is_active,
            'created_at': c.created_at.isoformat(),
            'title': c.config_json.get('title', 'N/A')
        } for c in configs]), 200

    @app.route('/admin/form-config/<int:config_id>', methods=['GET'])
    @admin_required
    def get_form_config_detail(config_id):
        config = FormConfig.query.get(config_id)
        if not config:
            return jsonify({'msg': 'Form config not found'}), 404

        return jsonify({
            'id': config.id,
            'year': config.year,
            'version': config.version,
            'is_active': config.is_active,
            'created_at': config.created_at.isoformat(),
            'updated_at': config.updated_at.isoformat(),
            'template_json': config.config_json
        }), 200

    @app.route('/admin/form-config', methods=['POST'])
    @admin_required
    def create_form_config():
        data = request.get_json() or {}
        template_json = data.get('template_json')
        year = data.get('year')
        set_active = data.get('set_active', True)

        if not template_json or not year:
            return jsonify({'msg': 'template_json and year required'}), 400

        # Get next version number for the year
        latest_version = db.session.query(db.func.max(FormConfig.version)).filter_by(year=year).scalar() or 0
        new_version = latest_version + 1

        # If setting as active, deactivate all other active forms globally
        if set_active:
            FormConfig.query.filter_by(is_active=True).update({'is_active': False})
            db.session.flush()  # Ensure deactivation is flushed before adding new config

        # Extract title from template_json
        title = template_json.get('title', f'Form {year} v{new_version}')

        new_config = FormConfig(
            title=title,
            config_json=template_json,
            year=year,
            version=new_version,
            is_active=set_active
        )

        db.session.add(new_config)
        db.session.commit()

        return jsonify({
            'msg': 'Form configuration created',
            'id': new_config.id,
            'year': new_config.year,
            'version': new_config.version,
            'is_active': new_config.is_active
        }), 201

    @app.route('/admin/form-config/<int:config_id>/activate', methods=['PUT'])
    @admin_required
    def activate_form_config(config_id):
        config = FormConfig.query.get(config_id)
        if not config:
            return jsonify({'msg': 'Form config not found'}), 404

        # Deactivate all active configs globally
        FormConfig.query.filter_by(is_active=True).update({'is_active': False})
        db.session.flush()

        # Activate this config
        config.is_active = True
        db.session.commit()

        return jsonify({'msg': 'Form configuration activated'}), 200

    @app.route('/admin/users', methods=['GET'])
    @admin_required
    def get_all_users():
        users = User.query.all()
        return jsonify([{
            'id': u.id,
            'email': u.email,
            'role': u.role,
            'created_at': u.created_at.isoformat()
        } for u in users]), 200

    @app.route('/admin/users', methods=['POST'])
    @admin_required
    def create_user():
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', User.ROLE_VOLUNTEER)

        if not email or not password:
            return jsonify({'msg': 'Email and password required'}), 400

        # Validate role
        if role not in [User.ROLE_ADMIN, User.ROLE_VOLUNTEER, User.ROLE_PANEL_MEMBER]:
            return jsonify({'msg': 'Invalid role. Must be admin, volunteer, or panel_member'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'msg': 'User already exists'}), 400

        new_user = User(email=email, role=role)
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            'msg': 'User created',
            'id': new_user.id,
            'email': new_user.email,
            'role': new_user.role
        }), 201

    # ===== Validation Schema Endpoints =====

    @app.route('/validation-schema', methods=['GET'])
    def get_validation_schema():
        """Public endpoint to get active validation schema"""
        active_schema = ValidationSchema.query.filter_by(is_active=True).order_by(
            ValidationSchema.year.desc(),
            ValidationSchema.version.desc()
        ).first()

        if active_schema:
            return jsonify(active_schema.schema_json), 200

        # Fallback to empty schema if none active
        return jsonify({}), 200

    @app.route('/admin/validation-schemas', methods=['GET'])
    @admin_required
    def get_all_validation_schemas():
        """Get all validation schemas (admin only)"""
        schemas = ValidationSchema.query.order_by(
            ValidationSchema.year.desc(),
            ValidationSchema.version.desc()
        ).all()

        return jsonify([{
            'id': s.id,
            'name': s.name,
            'description': s.description,
            'year': s.year,
            'version': s.version,
            'is_active': s.is_active,
            'created_at': s.created_at.isoformat(),
            'schema_json': s.schema_json
        } for s in schemas]), 200

    @app.route('/admin/validation-schema/<int:schema_id>', methods=['GET'])
    @admin_required
    def get_validation_schema_detail(schema_id):
        """Get specific validation schema detail (admin only)"""
        schema = ValidationSchema.query.get(schema_id)
        if not schema:
            return jsonify({'msg': 'Validation schema not found'}), 404

        return jsonify({
            'id': schema.id,
            'name': schema.name,
            'description': schema.description,
            'year': schema.year,
            'version': schema.version,
            'is_active': schema.is_active,
            'created_at': schema.created_at.isoformat(),
            'updated_at': schema.updated_at.isoformat(),
            'schema_json': schema.schema_json
        }), 200

    @app.route('/admin/validation-schema', methods=['POST'])
    @admin_required
    def create_validation_schema():
        """Create new validation schema version (admin only)"""
        data = request.get_json() or {}
        schema_json = data.get('schema_json')
        year = data.get('year')
        name = data.get('name', f'Validation Schema {year}')
        description = data.get('description')
        set_active = data.get('set_active', True)

        if not schema_json or not year:
            return jsonify({'msg': 'schema_json and year required'}), 400

        # Get next version number for the year
        latest_version = db.session.query(db.func.max(ValidationSchema.version)).filter_by(year=year).scalar() or 0
        new_version = latest_version + 1

        # If setting as active, deactivate all other active schemas globally
        if set_active:
            ValidationSchema.query.filter_by(is_active=True).update({'is_active': False})
            db.session.flush()  # Ensure deactivation is flushed before adding new schema

        new_schema = ValidationSchema(
            name=name,
            description=description,
            schema_json=schema_json,
            year=year,
            version=new_version,
            is_active=set_active
        )

        db.session.add(new_schema)
        db.session.commit()

        return jsonify({
            'msg': 'Validation schema created',
            'id': new_schema.id,
            'name': new_schema.name,
            'year': new_schema.year,
            'version': new_schema.version,
            'is_active': new_schema.is_active
        }), 201

    @app.route('/admin/validation-schema/<int:schema_id>/activate', methods=['PUT'])
    @admin_required
    def activate_validation_schema(schema_id):
        """Activate specific validation schema (admin only)"""
        schema = ValidationSchema.query.get(schema_id)
        if not schema:
            return jsonify({'msg': 'Validation schema not found'}), 404

        # Deactivate all active schemas globally
        ValidationSchema.query.filter_by(is_active=True).update({'is_active': False})
        db.session.flush()

        # Activate this schema
        schema.is_active = True
        db.session.commit()

        return jsonify({'msg': 'Validation schema activated'}), 200

    @app.route('/admin/applications', methods=['GET'])
    @can_view_applications
    def get_applications():
        """List all applications with pagination, sorting, and search"""
        # Get query parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        search = request.args.get('search', '').strip()
        candidate_ids = request.args.get('candidate_ids', '').strip()

        # Quick filters
        filter_appeared = request.args.get('filter_appeared', '').strip()
        filter_selected = request.args.get('filter_selected', '').strip()
        filter_considered = request.args.get('filter_considered', '').strip()

        # Build query
        query = Application.query.join(BasicInfo)

        # Apply candidate_ids filter (for widget navigation)
        if candidate_ids:
            ids_list = [cid.strip() for cid in candidate_ids.split(',') if cid.strip()]
            if ids_list:
                query = query.filter(Application.candidate_id.in_(ids_list))

        # Apply appeared filter (for panel members viewing only appeared candidates)
        if filter_appeared == 'true':
            query = query.filter(BasicInfo.appeared_for_one_to_one == True)
        elif filter_appeared == 'false':
            query = query.filter(BasicInfo.appeared_for_one_to_one == False)

        # Apply selected filter
        if filter_selected == 'true':
            query = query.filter(BasicInfo.selected == True)
        elif filter_selected == 'false':
            query = query.filter(BasicInfo.selected == False)

        # Apply considered filter
        if filter_considered == 'true':
            query = query.filter(BasicInfo.considered == True)
        elif filter_considered == 'false':
            query = query.filter(BasicInfo.considered == False)

        # Apply search filter
        if search:
            search_filter = db.or_(
                Application.candidate_id.ilike(f'%{search}%'),
                BasicInfo.full_name.ilike(f'%{search}%'),
                BasicInfo.email.ilike(f'%{search}%'),
                BasicInfo.contact.ilike(f'%{search}%'),
                BasicInfo.gender.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)

        # Apply sorting
        sort_column = getattr(Application, sort_by, None) or getattr(BasicInfo, sort_by, None)
        if sort_column is not None:
            if sort_order == 'desc':
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(Application.created_at.desc())

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        applications = []
        for app in pagination.items:
            applications.append({
                'id': app.id,
                'candidate_id': app.candidate_id,
                'uuid': app.uuid,
                'status': app.status,
                'created_at': app.created_at.isoformat(),
                'basic_info': {
                    'full_name': app.basic_info.full_name,
                    'email': app.basic_info.email,
                    'contact': app.basic_info.contact,
                    'gender': app.basic_info.gender,
                    'dob': app.basic_info.dob.isoformat() if app.basic_info.dob else None,
                    'shortlisted': app.basic_info.shortlisted,
                    'appeared_for_one_to_one': app.basic_info.appeared_for_one_to_one,
                    'selected': app.basic_info.selected,
                    'considered': app.basic_info.considered
                }
            })

        return jsonify({
            'applications': applications,
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        }), 200

    @app.route('/admin/application/<candidate_id>', methods=['GET'])
    @can_view_applications
    def get_application_detail(candidate_id):
        """Get full application details by candidate_id"""
        application = Application.query.filter_by(candidate_id=candidate_id).first()
        if not application:
            return jsonify({'msg': 'Application not found'}), 404

        # Build complete application data
        result = {
            'id': application.id,
            'candidate_id': application.candidate_id,
            'uuid': application.uuid,
            'status': application.status,
            'created_at': application.created_at.isoformat(),
            'updated_at': application.updated_at.isoformat(),
            'basic_info': {
                'full_name': application.basic_info.full_name,
                'dob': application.basic_info.dob.isoformat() if application.basic_info.dob else None,
                'gender': application.basic_info.gender,
                'email': application.basic_info.email,
                'differently_abled': application.basic_info.differently_abled,
                'contact': application.basic_info.contact,
                'contact_as_whatsapp': application.basic_info.contact_as_whatsapp,
                'whatsapp_contact': application.basic_info.whatsapp_contact,
                'has_laptop': application.basic_info.has_laptop,
                'laptop_ram': application.basic_info.laptop_ram,
                'laptop_processor': application.basic_info.laptop_processor,
                # Panel member review fields
                'considered': application.basic_info.considered,
                'selected': application.basic_info.selected,
                'shortlisted': application.basic_info.shortlisted,
                'shortlisted_by': application.basic_info.shortlisted_by,
                'shortlisted_at': application.basic_info.shortlisted_at.isoformat() if application.basic_info.shortlisted_at else None,
                'shortlister_email': application.basic_info.shortlister.email if application.basic_info.shortlister else None,
                'remarks': application.basic_info.remarks,
                'reviewed_by': application.basic_info.reviewed_by,
                'reviewer_email': application.basic_info.reviewer.email if application.basic_info.reviewer else None
            },
            'educational_info': {
                'college_name': application.educational_info.college_name,
                'degree': application.educational_info.degree,
                'department': application.educational_info.department,
                'year': application.educational_info.year,
                'tamil_medium': application.educational_info.tamil_medium,
                'six_to_8_govt_school': application.educational_info.six_to_8_govt_school,
                'six_to_8_school_name': application.educational_info.six_to_8_school_name,
                'nine_to_10_govt_school': application.educational_info.nine_to_10_govt_school,
                'nine_to_10_school_name': application.educational_info.nine_to_10_school_name,
                'eleven_to_12_govt_school': application.educational_info.eleven_to_12_govt_school,
                'eleven_to_12_school_name': application.educational_info.eleven_to_12_school_name,
                'present_work': application.educational_info.present_work,
                'received_scholarship': application.educational_info.received_scholarship,
                'scholarship_details': application.educational_info.scholarship_details,
                'transport_mode': application.educational_info.transport_mode,
                'vglug_applied_before': application.educational_info.vglug_applied_before
            },
            'family_info': {
                'family_environment': application.family_info.family_environment,
                'single_parent_info': application.family_info.single_parent_info,
                'family_members_count': application.family_info.family_members_count,
                'family_members_details': application.family_info.family_members_details,
                'earning_members_count': application.family_info.earning_members_count,
                'earning_members_details': application.family_info.earning_members_details,
                'guardian_details': application.family_info.guardian_details
            },
            'income_info': {
                'total_family_income': application.income_info.total_family_income,
                'own_land_size': application.income_info.own_land_size,
                'house_ownership': application.income_info.house_ownership,
                'full_address': application.income_info.full_address,
                'pincode': application.income_info.pincode,
                'district': application.income_info.district
            },
            'course_info': {
                'preferred_course': application.course_info.preferred_course,
                'training_benefit': application.course_info.training_benefit,
                'heard_about_vglug': application.course_info.heard_about_vglug,
                'participated_in_vglug_events': application.course_info.participated_in_vglug_events
            }
        }

        return jsonify(result), 200

    @app.route('/admin/application/<candidate_id>', methods=['PUT'])
    @can_edit_applications
    def update_application(candidate_id):
        """Update application details (admin and panel_member only)"""
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())

        application = Application.query.filter_by(candidate_id=candidate_id).first()
        if not application:
            return jsonify({'msg': 'Application not found'}), 404

        data = request.get_json() or {}

        # Update basic_info
        if 'basic_info' in data:
            basic = data['basic_info']
            if 'full_name' in basic:
                application.basic_info.full_name = basic['full_name']
            if 'email' in basic:
                application.basic_info.email = basic['email']
            if 'contact' in basic:
                application.basic_info.contact = basic['contact']
            if 'gender' in basic:
                application.basic_info.gender = basic['gender']
            if 'differently_abled' in basic:
                application.basic_info.differently_abled = basic['differently_abled']
            if 'whatsapp_contact' in basic:
                application.basic_info.whatsapp_contact = basic['whatsapp_contact']
            if 'contact_as_whatsapp' in basic:
                application.basic_info.contact_as_whatsapp = basic['contact_as_whatsapp']
            if 'has_laptop' in basic:
                application.basic_info.has_laptop = basic['has_laptop']
            if 'laptop_ram' in basic:
                application.basic_info.laptop_ram = basic['laptop_ram']
            if 'laptop_processor' in basic:
                application.basic_info.laptop_processor = basic['laptop_processor']
            # Panel member review fields
            if 'considered' in basic:
                application.basic_info.considered = basic['considered']
            if 'selected' in basic:
                application.basic_info.selected = basic['selected']
            if 'remarks' in basic:
                application.basic_info.remarks = basic['remarks']
            # Auto-set reviewed_by when any review field is updated
            if any(key in basic for key in ['considered', 'selected', 'remarks']):
                application.basic_info.reviewed_by = user_id

        # Update educational_info
        if 'educational_info' in data:
            edu = data['educational_info']
            if 'college_name' in edu:
                application.educational_info.college_name = edu['college_name']
            if 'degree' in edu:
                application.educational_info.degree = edu['degree']
            if 'department' in edu:
                application.educational_info.department = edu['department']
            if 'year' in edu:
                application.educational_info.year = edu['year']
            if 'tamil_medium' in edu:
                application.educational_info.tamil_medium = edu['tamil_medium']
            if 'six_to_8_govt_school' in edu:
                application.educational_info.six_to_8_govt_school = edu['six_to_8_govt_school']
            if 'six_to_8_school_name' in edu:
                application.educational_info.six_to_8_school_name = edu['six_to_8_school_name']
            if 'nine_to_10_govt_school' in edu:
                application.educational_info.nine_to_10_govt_school = edu['nine_to_10_govt_school']
            if 'nine_to_10_school_name' in edu:
                application.educational_info.nine_to_10_school_name = edu['nine_to_10_school_name']
            if 'eleven_to_12_govt_school' in edu:
                application.educational_info.eleven_to_12_govt_school = edu['eleven_to_12_govt_school']
            if 'eleven_to_12_school_name' in edu:
                application.educational_info.eleven_to_12_school_name = edu['eleven_to_12_school_name']
            if 'present_work' in edu:
                application.educational_info.present_work = edu['present_work']
            if 'received_scholarship' in edu:
                application.educational_info.received_scholarship = edu['received_scholarship']
            if 'scholarship_details' in edu:
                application.educational_info.scholarship_details = edu['scholarship_details']
            if 'transport_mode' in edu:
                application.educational_info.transport_mode = edu['transport_mode']
            if 'vglug_applied_before' in edu:
                application.educational_info.vglug_applied_before = edu['vglug_applied_before']

        # Update family_info
        if 'family_info' in data:
            fam = data['family_info']
            if 'family_environment' in fam:
                application.family_info.family_environment = fam['family_environment']
            if 'single_parent_info' in fam:
                application.family_info.single_parent_info = fam['single_parent_info']
            if 'family_members_count' in fam:
                application.family_info.family_members_count = fam['family_members_count']
            if 'family_members_details' in fam:
                application.family_info.family_members_details = fam['family_members_details']
            if 'earning_members_count' in fam:
                application.family_info.earning_members_count = fam['earning_members_count']
            if 'earning_members_details' in fam:
                application.family_info.earning_members_details = fam['earning_members_details']
            if 'guardian_details' in fam:
                application.family_info.guardian_details = fam['guardian_details']

        # Update income_info
        if 'income_info' in data:
            inc = data['income_info']
            if 'total_family_income' in inc:
                application.income_info.total_family_income = inc['total_family_income']
            if 'own_land_size' in inc:
                application.income_info.own_land_size = inc['own_land_size']
            if 'house_ownership' in inc:
                application.income_info.house_ownership = inc['house_ownership']
            if 'full_address' in inc:
                application.income_info.full_address = inc['full_address']
            if 'pincode' in inc:
                application.income_info.pincode = inc['pincode']
            if 'district' in inc:
                application.income_info.district = inc['district']

        # Update course_info
        if 'course_info' in data:
            course = data['course_info']
            if 'preferred_course' in course:
                application.course_info.preferred_course = course['preferred_course']
            if 'training_benefit' in course:
                application.course_info.training_benefit = course['training_benefit']
            if 'heard_about_vglug' in course:
                application.course_info.heard_about_vglug = course['heard_about_vglug']
            if 'participated_in_vglug_events' in course:
                application.course_info.participated_in_vglug_events = course['participated_in_vglug_events']

        # Update status if provided
        if 'status' in data:
            application.status = data['status']

        db.session.commit()

        return jsonify({'msg': 'Application updated successfully'}), 200

    @app.route('/admin/application/<candidate_id>/shortlist', methods=['PUT'])
    @can_edit_applications
    def shortlist_application(candidate_id):
        """Shortlist or un-shortlist a single application"""
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())

        application = Application.query.filter_by(candidate_id=candidate_id).first()
        if not application:
            return jsonify({'msg': 'Application not found'}), 404

        data = request.get_json() or {}
        shortlisted = data.get('shortlisted', True)

        application.basic_info.shortlisted = shortlisted
        if shortlisted:
            application.basic_info.shortlisted_by = user_id
            application.basic_info.shortlisted_at = datetime.utcnow()
        else:
            application.basic_info.shortlisted_by = None
            application.basic_info.shortlisted_at = None

        db.session.commit()

        return jsonify({
            'msg': f'Application {"shortlisted" if shortlisted else "un-shortlisted"} successfully',
            'candidate_id': candidate_id,
            'shortlisted': shortlisted
        }), 200

    @app.route('/admin/applications/bulk-shortlist', methods=['PUT'])
    @can_edit_applications
    def bulk_shortlist_applications():
        """Shortlist or un-shortlist multiple applications at once"""
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())

        data = request.get_json() or {}
        candidate_ids = data.get('candidate_ids', [])
        shortlisted = data.get('shortlisted', True)

        if not candidate_ids:
            return jsonify({'msg': 'candidate_ids array is required'}), 400

        updated_count = 0
        now = datetime.utcnow()

        for candidate_id in candidate_ids:
            application = Application.query.filter_by(candidate_id=candidate_id).first()
            if application and application.basic_info:
                application.basic_info.shortlisted = shortlisted
                if shortlisted:
                    application.basic_info.shortlisted_by = user_id
                    application.basic_info.shortlisted_at = now
                else:
                    application.basic_info.shortlisted_by = None
                    application.basic_info.shortlisted_at = None
                updated_count += 1

        db.session.commit()

        return jsonify({
            'msg': f'{updated_count} application(s) {"shortlisted" if shortlisted else "un-shortlisted"} successfully',
            'updated_count': updated_count,
            'shortlisted': shortlisted
        }), 200

    @app.route('/admin/me', methods=['GET'])
    def get_current_user():
        """Get current logged-in user details"""
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 401

        return jsonify({
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'can_edit_applications': user.can_edit_applications(),
            'can_manage_forms': user.can_manage_forms()
        }), 200

    @app.route('/admin/dashboard-stats', methods=['GET'])
    @admin_required
    def get_dashboard_stats():
        """Get dashboard statistics for admin (admin only)"""
        from sqlalchemy import func

        # Total applications count
        total_applications = Application.query.count()

        # Review status counts
        considered_count = BasicInfo.query.filter(BasicInfo.considered == True).count()
        not_considered_count = BasicInfo.query.filter(BasicInfo.considered == False).count()
        pending_review_count = BasicInfo.query.filter(BasicInfo.considered == None).count()

        selected_count = BasicInfo.query.filter(BasicInfo.selected == True).count()
        not_selected_count = BasicInfo.query.filter(BasicInfo.selected == False).count()

        # ===== Educational Statistics =====

        # Government school statistics by year range
        govt_school_6_to_8 = EducationalInfo.query.filter(EducationalInfo.six_to_8_govt_school == True).count()
        private_school_6_to_8 = EducationalInfo.query.filter(EducationalInfo.six_to_8_govt_school == False).count()

        govt_school_9_to_10 = EducationalInfo.query.filter(EducationalInfo.nine_to_10_govt_school == True).count()
        private_school_9_to_10 = EducationalInfo.query.filter(EducationalInfo.nine_to_10_govt_school == False).count()

        govt_school_11_to_12 = EducationalInfo.query.filter(EducationalInfo.eleven_to_12_govt_school == True).count()
        private_school_11_to_12 = EducationalInfo.query.filter(EducationalInfo.eleven_to_12_govt_school == False).count()

        # College-wise distribution (top 10)
        college_distribution = db.session.query(
            EducationalInfo.college_name,
            func.count(EducationalInfo.id).label('count')
        ).group_by(EducationalInfo.college_name).order_by(func.count(EducationalInfo.id).desc()).limit(10).all()

        # Degree-wise distribution
        degree_distribution = db.session.query(
            EducationalInfo.degree,
            func.count(EducationalInfo.id).label('count')
        ).group_by(EducationalInfo.degree).order_by(func.count(EducationalInfo.id).desc()).all()

        # Department-wise distribution (top 10)
        department_distribution = db.session.query(
            EducationalInfo.department,
            func.count(EducationalInfo.id).label('count')
        ).group_by(EducationalInfo.department).order_by(func.count(EducationalInfo.id).desc()).limit(10).all()

        # Year of study distribution
        year_distribution = db.session.query(
            EducationalInfo.year,
            func.count(EducationalInfo.id).label('count')
        ).group_by(EducationalInfo.year).order_by(EducationalInfo.year).all()

        # Scholarship statistics
        scholarship_received = EducationalInfo.query.filter(EducationalInfo.received_scholarship == True).count()
        scholarship_not_received = EducationalInfo.query.filter(EducationalInfo.received_scholarship == False).count()

        # Tamil medium statistics
        tamil_medium_count = EducationalInfo.query.filter(EducationalInfo.tamil_medium == True).count()
        english_medium_count = EducationalInfo.query.filter(EducationalInfo.tamil_medium == False).count()

        # Transport mode distribution
        transport_distribution = db.session.query(
            EducationalInfo.transport_mode,
            func.count(EducationalInfo.id).label('count')
        ).group_by(EducationalInfo.transport_mode).order_by(func.count(EducationalInfo.id).desc()).all()

        # VGLUG applied before distribution
        vglug_applied_distribution = db.session.query(
            EducationalInfo.vglug_applied_before,
            func.count(EducationalInfo.id).label('count')
        ).group_by(EducationalInfo.vglug_applied_before).all()

        # ===== Family Statistics =====

        # Family environment distribution
        family_env_distribution = db.session.query(
            FamilyInfo.family_environment,
            func.count(FamilyInfo.id).label('count')
        ).group_by(FamilyInfo.family_environment).all()

        # Single parent info distribution
        single_parent_distribution = db.session.query(
            FamilyInfo.single_parent_info,
            func.count(FamilyInfo.id).label('count')
        ).filter(FamilyInfo.single_parent_info != None).group_by(FamilyInfo.single_parent_info).all()

        # Family members count distribution
        family_members_distribution = db.session.query(
            FamilyInfo.family_members_count,
            func.count(FamilyInfo.id).label('count')
        ).group_by(FamilyInfo.family_members_count).order_by(FamilyInfo.family_members_count).all()

        # Earning members count distribution
        earning_members_distribution = db.session.query(
            FamilyInfo.earning_members_count,
            func.count(FamilyInfo.id).label('count')
        ).group_by(FamilyInfo.earning_members_count).order_by(FamilyInfo.earning_members_count).all()

        # ===== Income Statistics =====

        # Total family income distribution by ranges
        # Get all income values and categorize them into ranges
        all_incomes = db.session.query(IncomeInfo.total_family_income).filter(
            IncomeInfo.total_family_income != None,
            IncomeInfo.total_family_income != ''
        ).all()

        # Define income ranges
        income_ranges = {
            '< 50,000': 0,
            '50,000 - 1,00,000': 0,
            '1,00,000 - 2,50,000': 0,
            '2,50,000 - 4,00,000': 0,
            '> 4,00,000': 0,
            'Not Specified': 0
        }

        for (income_str,) in all_incomes:
            try:
                # Try to parse the income value (remove commas, spaces, etc.)
                income_clean = ''.join(c for c in str(income_str) if c.isdigit())
                if income_clean:
                    income_val = int(income_clean)
                    if income_val < 50000:
                        income_ranges['< 50,000'] += 1
                    elif income_val < 100000:
                        income_ranges['50,000 - 1,00,000'] += 1
                    elif income_val < 250000:
                        income_ranges['1,00,000 - 2,50,000'] += 1
                    elif income_val < 400000:
                        income_ranges['2,50,000 - 4,00,000'] += 1
                    else:
                        income_ranges['> 4,00,000'] += 1
                else:
                    income_ranges['Not Specified'] += 1
            except (ValueError, TypeError):
                income_ranges['Not Specified'] += 1

        # Convert to list format for frontend, maintaining order
        income_range_order = ['< 50,000', '50,000 - 1,00,000', '1,00,000 - 2,50,000', '2,50,000 - 4,00,000', '> 4,00,000']
        income_distribution = [{'name': r, 'count': income_ranges[r]} for r in income_range_order if income_ranges[r] > 0]

        # House ownership distribution
        house_ownership_distribution = db.session.query(
            IncomeInfo.house_ownership,
            func.count(IncomeInfo.id).label('count')
        ).group_by(IncomeInfo.house_ownership).all()

        # District-wise distribution (top 10)
        district_distribution = db.session.query(
            IncomeInfo.district,
            func.count(IncomeInfo.id).label('count')
        ).group_by(IncomeInfo.district).order_by(func.count(IncomeInfo.id).desc()).limit(10).all()

        # ===== Basic Info Statistics =====

        # Gender distribution
        gender_distribution = db.session.query(
            BasicInfo.gender,
            func.count(BasicInfo.id).label('count')
        ).group_by(BasicInfo.gender).all()

        # Differently abled statistics
        differently_abled_count = BasicInfo.query.filter(BasicInfo.differently_abled == True).count()
        not_differently_abled_count = BasicInfo.query.filter(BasicInfo.differently_abled == False).count()

        # Laptop availability
        has_laptop_count = BasicInfo.query.filter(BasicInfo.has_laptop == True).count()
        no_laptop_count = BasicInfo.query.filter(BasicInfo.has_laptop == False).count()

        # ===== Course Statistics =====

        # Preferred course distribution
        course_distribution = db.session.query(
            CourseInfo.preferred_course,
            func.count(CourseInfo.id).label('count')
        ).group_by(CourseInfo.preferred_course).order_by(func.count(CourseInfo.id).desc()).all()

        # Heard about VGLUG statistics
        heard_about_vglug = CourseInfo.query.filter(CourseInfo.heard_about_vglug == True).count()
        not_heard_about_vglug = CourseInfo.query.filter(CourseInfo.heard_about_vglug == False).count()

        # Participated in VGLUG events
        participated_count = CourseInfo.query.filter(CourseInfo.participated_in_vglug_events == True).count()
        not_participated_count = CourseInfo.query.filter(CourseInfo.participated_in_vglug_events == False).count()

        return jsonify({
            'overview': {
                'total_applications': total_applications,
                'considered': considered_count,
                'not_considered': not_considered_count,
                'pending_review': pending_review_count,
                'selected': selected_count,
                'not_selected': not_selected_count
            },
            'educational': {
                'govt_school_by_year': {
                    '6_to_8': {'govt': govt_school_6_to_8, 'private': private_school_6_to_8},
                    '9_to_10': {'govt': govt_school_9_to_10, 'private': private_school_9_to_10},
                    '11_to_12': {'govt': govt_school_11_to_12, 'private': private_school_11_to_12}
                },
                'college_distribution': [{'name': c[0], 'count': c[1]} for c in college_distribution],
                'degree_distribution': [{'name': d[0], 'count': d[1]} for d in degree_distribution],
                'department_distribution': [{'name': d[0], 'count': d[1]} for d in department_distribution],
                'year_distribution': [{'name': y[0], 'count': y[1]} for y in year_distribution],
                'scholarship': {'received': scholarship_received, 'not_received': scholarship_not_received},
                'medium': {'tamil': tamil_medium_count, 'english': english_medium_count},
                'transport_distribution': [{'name': t[0], 'count': t[1]} for t in transport_distribution],
                'vglug_applied_before': [{'name': v[0], 'count': v[1]} for v in vglug_applied_distribution]
            },
            'family': {
                'family_environment': [{'name': f[0], 'count': f[1]} for f in family_env_distribution],
                'single_parent': [{'name': s[0], 'count': s[1]} for s in single_parent_distribution],
                'family_members': [{'name': str(f[0]), 'count': f[1]} for f in family_members_distribution],
                'earning_members': [{'name': str(e[0]), 'count': e[1]} for e in earning_members_distribution]
            },
            'income': {
                'income_distribution': income_distribution,
                'house_ownership': [{'name': h[0], 'count': h[1]} for h in house_ownership_distribution],
                'district_distribution': [{'name': d[0], 'count': d[1]} for d in district_distribution]
            },
            'basic': {
                'gender': [{'name': g[0], 'count': g[1]} for g in gender_distribution],
                'differently_abled': {'yes': differently_abled_count, 'no': not_differently_abled_count},
                'laptop': {'has': has_laptop_count, 'no': no_laptop_count}
            },
            'course': {
                'preferred_course': [{'name': c[0], 'count': c[1]} for c in course_distribution],
                'heard_about_vglug': {'yes': heard_about_vglug, 'no': not_heard_about_vglug},
                'participated_in_events': {'yes': participated_count, 'no': not_participated_count}
            }
        }), 200

    # ===== Widget Endpoints =====

    @app.route('/admin/widgets/metadata', methods=['GET'])
    @admin_required
    def widget_metadata():
        """Get available tables, fields, and operators for widget builder"""
        return jsonify(get_widget_metadata()), 200

    @app.route('/admin/widgets', methods=['GET'])
    @admin_required
    def list_widgets():
        """List all active widgets"""
        widgets = Widget.query.filter_by(is_active=True).order_by(Widget.position).all()
        return jsonify([{
            'id': w.id,
            'title': w.title,
            'description': w.description,
            'widget_type': w.widget_type,
            'config_json': w.config_json,
            'position': w.position,
            'width': w.width,
            'created_by': w.creator.email if w.creator else None,
            'created_at': w.created_at.isoformat() if w.created_at else None,
            'updated_at': w.updated_at.isoformat() if w.updated_at else None
        } for w in widgets]), 200

    @app.route('/admin/widgets', methods=['POST'])
    @admin_required
    def create_widget():
        """Create a new widget"""
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())

        data = request.get_json() or {}

        # Validate required fields
        required = ['title', 'widget_type', 'config_json']
        for field in required:
            if field not in data:
                return jsonify({'msg': f'{field} is required'}), 400

        # Validate widget_type
        valid_types = ['pie', 'bar', 'line', 'number', 'table']
        if data['widget_type'] not in valid_types:
            return jsonify({'msg': f'Invalid widget_type. Must be one of: {valid_types}'}), 400

        # Get max position
        max_pos = db.session.query(func.max(Widget.position)).filter_by(is_active=True).scalar() or 0

        widget = Widget(
            title=data['title'],
            description=data.get('description'),
            widget_type=data['widget_type'],
            config_json=data['config_json'],
            position=max_pos + 1,
            width=data.get('width', 'col-md-6'),
            created_by=user_id
        )

        db.session.add(widget)
        db.session.commit()

        return jsonify({
            'msg': 'Widget created successfully',
            'id': widget.id,
            'title': widget.title
        }), 201

    @app.route('/admin/widgets/<int:widget_id>', methods=['GET'])
    @admin_required
    def get_widget(widget_id):
        """Get a specific widget"""
        widget = Widget.query.get(widget_id)
        if not widget:
            return jsonify({'msg': 'Widget not found'}), 404

        return jsonify({
            'id': widget.id,
            'title': widget.title,
            'description': widget.description,
            'widget_type': widget.widget_type,
            'config_json': widget.config_json,
            'position': widget.position,
            'width': widget.width,
            'is_active': widget.is_active,
            'created_by': widget.creator.email if widget.creator else None,
            'created_at': widget.created_at.isoformat() if widget.created_at else None,
            'updated_at': widget.updated_at.isoformat() if widget.updated_at else None
        }), 200

    @app.route('/admin/widgets/<int:widget_id>', methods=['PUT'])
    @admin_required
    def update_widget(widget_id):
        """Update an existing widget"""
        widget = Widget.query.get(widget_id)
        if not widget:
            return jsonify({'msg': 'Widget not found'}), 404

        data = request.get_json() or {}

        if 'title' in data:
            widget.title = data['title']
        if 'description' in data:
            widget.description = data['description']
        if 'widget_type' in data:
            valid_types = ['pie', 'bar', 'line', 'number', 'table']
            if data['widget_type'] not in valid_types:
                return jsonify({'msg': f'Invalid widget_type. Must be one of: {valid_types}'}), 400
            widget.widget_type = data['widget_type']
        if 'config_json' in data:
            widget.config_json = data['config_json']
        if 'position' in data:
            widget.position = data['position']
        if 'width' in data:
            widget.width = data['width']
        if 'is_active' in data:
            widget.is_active = data['is_active']

        db.session.commit()

        return jsonify({'msg': 'Widget updated successfully', 'id': widget.id}), 200

    @app.route('/admin/widgets/<int:widget_id>', methods=['DELETE'])
    @admin_required
    def delete_widget(widget_id):
        """Soft delete a widget (set is_active to False)"""
        widget = Widget.query.get(widget_id)
        if not widget:
            return jsonify({'msg': 'Widget not found'}), 404

        widget.is_active = False
        db.session.commit()

        return jsonify({'msg': 'Widget deleted successfully'}), 200

    @app.route('/admin/widgets/preview', methods=['POST'])
    @admin_required
    def preview_widget():
        """Execute widget query and return data for preview"""
        data = request.get_json() or {}
        config = data.get('config_json')

        if not config:
            return jsonify({'msg': 'config_json is required'}), 400

        try:
            result = execute_widget_query(config)
            return jsonify({
                'data': result['data'],
                'row_count': result['row_count']
            }), 200
        except ValueError as e:
            return jsonify({'msg': str(e)}), 400
        except Exception as e:
            return jsonify({'msg': f'Query execution failed: {str(e)}'}), 500

    @app.route('/admin/widgets/<int:widget_id>/data', methods=['GET'])
    @admin_required
    def get_widget_data(widget_id):
        """Get data for a specific saved widget"""
        widget = Widget.query.get(widget_id)
        if not widget:
            return jsonify({'msg': 'Widget not found'}), 404

        try:
            result = execute_widget_query(widget.config_json)
            return jsonify({
                'widget_id': widget.id,
                'title': widget.title,
                'widget_type': widget.widget_type,
                'data': result['data'],
                'row_count': result['row_count'],
                'chart_config': widget.config_json.get('chart_config', {})
            }), 200
        except ValueError as e:
            return jsonify({'msg': str(e)}), 400
        except Exception as e:
            return jsonify({'msg': f'Query execution failed: {str(e)}'}), 500

    @app.route('/admin/widgets/reorder', methods=['PUT'])
    @admin_required
    def reorder_widgets():
        """Reorder widgets by updating their positions"""
        data = request.get_json() or {}
        positions = data.get('positions', [])  # List of {id, position}

        if not positions:
            return jsonify({'msg': 'positions array is required'}), 400

        for item in positions:
            widget_id = item.get('id')
            position = item.get('position')
            if widget_id and position is not None:
                widget = Widget.query.get(widget_id)
                if widget:
                    widget.position = position

        db.session.commit()

        return jsonify({'msg': 'Widgets reordered successfully'}), 200

    @app.route('/admin/widgets/<int:widget_id>/candidates', methods=['GET'])
    @admin_required
    def get_widget_candidates(widget_id):
        """Get candidate IDs matching the widget's query conditions"""
        widget = Widget.query.get(widget_id)
        if not widget:
            return jsonify({'msg': 'Widget not found'}), 404

        try:
            candidate_ids = get_widget_candidate_ids(widget.config_json)
            return jsonify({
                'widget_id': widget.id,
                'widget_title': widget.title,
                'candidate_ids': candidate_ids,
                'count': len(candidate_ids)
            }), 200
        except ValueError as e:
            return jsonify({'msg': str(e)}), 400
        except Exception as e:
            return jsonify({'msg': f'Failed to get candidate IDs: {str(e)}'}), 500

    @app.route('/admin/widgets/<int:widget_id>/segment-candidates', methods=['POST'])
    @admin_required
    def get_widget_segment_candidates(widget_id):
        """Get candidate IDs matching the widget's query conditions plus a segment filter"""
        widget = Widget.query.get(widget_id)
        if not widget:
            return jsonify({'msg': 'Widget not found'}), 404

        data = request.get_json() or {}
        segment_field = data.get('segment_field')
        segment_value = data.get('segment_value')

        if not segment_field:
            return jsonify({'msg': 'segment_field is required'}), 400

        try:
            candidate_ids = get_widget_segment_candidate_ids(
                widget.config_json,
                segment_field,
                segment_value
            )
            return jsonify({
                'widget_id': widget.id,
                'widget_title': widget.title,
                'segment_field': segment_field,
                'segment_value': segment_value,
                'candidate_ids': candidate_ids,
                'count': len(candidate_ids)
            }), 200
        except ValueError as e:
            return jsonify({'msg': str(e)}), 400
        except Exception as e:
            return jsonify({'msg': f'Failed to get segment candidate IDs: {str(e)}'}), 500

    @app.route('/admin/dashboard-filter-candidates', methods=['POST'])
    @admin_required
    def get_dashboard_filter_candidates():
        """Get candidate IDs based on dashboard widget filter criteria"""
        from sqlalchemy import func

        data = request.get_json() or {}
        filter_type = data.get('filter_type')
        filter_value = data.get('filter_value')

        if not filter_type:
            return jsonify({'msg': 'filter_type is required'}), 400

        try:
            candidate_ids = []

            # Review status filters (from BasicInfo)
            if filter_type == 'review_status':
                if filter_value == 'Considered':
                    candidates = db.session.query(BasicInfo.candidate_id).filter(BasicInfo.considered == True).all()
                elif filter_value == 'Not Considered':
                    candidates = db.session.query(BasicInfo.candidate_id).filter(BasicInfo.considered == False).all()
                elif filter_value == 'Pending':
                    candidates = db.session.query(BasicInfo.candidate_id).filter(BasicInfo.considered == None).all()
                else:
                    return jsonify({'msg': f'Unknown filter_value for review_status: {filter_value}'}), 400
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Selection status filters
            elif filter_type == 'selection_status':
                if filter_value == 'Selected':
                    candidates = db.session.query(BasicInfo.candidate_id).filter(BasicInfo.selected == True).all()
                elif filter_value == 'Not Selected':
                    candidates = db.session.query(BasicInfo.candidate_id).filter(BasicInfo.selected == False).all()
                else:
                    return jsonify({'msg': f'Unknown filter_value for selection_status: {filter_value}'}), 400
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Gender filter
            elif filter_type == 'gender':
                candidates = db.session.query(BasicInfo.candidate_id).filter(BasicInfo.gender == filter_value).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Laptop availability filter
            elif filter_type == 'laptop':
                if filter_value == 'Has Laptop':
                    candidates = db.session.query(BasicInfo.candidate_id).filter(BasicInfo.has_laptop == True).all()
                elif filter_value == 'No Laptop':
                    candidates = db.session.query(BasicInfo.candidate_id).filter(BasicInfo.has_laptop == False).all()
                else:
                    return jsonify({'msg': f'Unknown filter_value for laptop: {filter_value}'}), 400
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Differently abled filter
            elif filter_type == 'differently_abled':
                if filter_value == 'Yes':
                    candidates = db.session.query(BasicInfo.candidate_id).filter(BasicInfo.differently_abled == True).all()
                elif filter_value == 'No':
                    candidates = db.session.query(BasicInfo.candidate_id).filter(BasicInfo.differently_abled == False).all()
                else:
                    return jsonify({'msg': f'Unknown filter_value for differently_abled: {filter_value}'}), 400
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Preferred course filter
            elif filter_type == 'preferred_course':
                candidates = db.session.query(CourseInfo.candidate_id).filter(CourseInfo.preferred_course == filter_value).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Government school filters
            elif filter_type == 'govt_school_6_to_8':
                is_govt = filter_value == 'Government'
                candidates = db.session.query(EducationalInfo.candidate_id).filter(
                    EducationalInfo.six_to_8_govt_school == is_govt
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            elif filter_type == 'govt_school_9_to_10':
                is_govt = filter_value == 'Government'
                candidates = db.session.query(EducationalInfo.candidate_id).filter(
                    EducationalInfo.nine_to_10_govt_school == is_govt
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            elif filter_type == 'govt_school_11_to_12':
                is_govt = filter_value == 'Government'
                candidates = db.session.query(EducationalInfo.candidate_id).filter(
                    EducationalInfo.eleven_to_12_govt_school == is_govt
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            # College filter
            elif filter_type == 'college':
                candidates = db.session.query(EducationalInfo.candidate_id).filter(
                    EducationalInfo.college_name == filter_value
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Degree filter
            elif filter_type == 'degree':
                candidates = db.session.query(EducationalInfo.candidate_id).filter(
                    EducationalInfo.degree == filter_value
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Department filter
            elif filter_type == 'department':
                candidates = db.session.query(EducationalInfo.candidate_id).filter(
                    EducationalInfo.department == filter_value
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Year filter
            elif filter_type == 'year':
                candidates = db.session.query(EducationalInfo.candidate_id).filter(
                    EducationalInfo.year == filter_value
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Scholarship filter
            elif filter_type == 'scholarship':
                if filter_value == 'Received':
                    candidates = db.session.query(EducationalInfo.candidate_id).filter(
                        EducationalInfo.received_scholarship == True
                    ).all()
                elif filter_value == 'Not Received':
                    candidates = db.session.query(EducationalInfo.candidate_id).filter(
                        EducationalInfo.received_scholarship == False
                    ).all()
                else:
                    return jsonify({'msg': f'Unknown filter_value for scholarship: {filter_value}'}), 400
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Medium filter
            elif filter_type == 'medium':
                if filter_value == 'Tamil Medium':
                    candidates = db.session.query(EducationalInfo.candidate_id).filter(
                        EducationalInfo.tamil_medium == True
                    ).all()
                elif filter_value == 'English Medium':
                    candidates = db.session.query(EducationalInfo.candidate_id).filter(
                        EducationalInfo.tamil_medium == False
                    ).all()
                else:
                    return jsonify({'msg': f'Unknown filter_value for medium: {filter_value}'}), 400
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Transport filter
            elif filter_type == 'transport':
                candidates = db.session.query(EducationalInfo.candidate_id).filter(
                    EducationalInfo.transport_mode == filter_value
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Family environment filter
            elif filter_type == 'family_environment':
                candidates = db.session.query(FamilyInfo.candidate_id).filter(
                    FamilyInfo.family_environment == filter_value
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Single parent filter
            elif filter_type == 'single_parent':
                candidates = db.session.query(FamilyInfo.candidate_id).filter(
                    FamilyInfo.single_parent_info == filter_value
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            # Family members filter
            elif filter_type == 'family_members':
                try:
                    count = int(filter_value)
                    candidates = db.session.query(FamilyInfo.candidate_id).filter(
                        FamilyInfo.family_members_count == count
                    ).all()
                    candidate_ids = [c[0] for c in candidates if c[0]]
                except ValueError:
                    return jsonify({'msg': f'Invalid filter_value for family_members: {filter_value}'}), 400

            # Earning members filter
            elif filter_type == 'earning_members':
                try:
                    count = int(filter_value)
                    candidates = db.session.query(FamilyInfo.candidate_id).filter(
                        FamilyInfo.earning_members_count == count
                    ).all()
                    candidate_ids = [c[0] for c in candidates if c[0]]
                except ValueError:
                    return jsonify({'msg': f'Invalid filter_value for earning_members: {filter_value}'}), 400

            # Income range filter
            elif filter_type == 'income_range':
                # Get all income records and filter by range
                all_incomes = db.session.query(
                    IncomeInfo.candidate_id,
                    IncomeInfo.total_family_income
                ).filter(
                    IncomeInfo.total_family_income != None,
                    IncomeInfo.total_family_income != ''
                ).all()

                for candidate_id, income_str in all_incomes:
                    if not candidate_id:
                        continue
                    try:
                        income_clean = ''.join(c for c in str(income_str) if c.isdigit())
                        if income_clean:
                            income_val = int(income_clean)
                            matches = False
                            if filter_value == '< 50,000' and income_val < 50000:
                                matches = True
                            elif filter_value == '50,000 - 1,00,000' and 50000 <= income_val < 100000:
                                matches = True
                            elif filter_value == '1,00,000 - 2,50,000' and 100000 <= income_val < 250000:
                                matches = True
                            elif filter_value == '2,50,000 - 4,00,000' and 250000 <= income_val < 400000:
                                matches = True
                            elif filter_value == '> 4,00,000' and income_val >= 400000:
                                matches = True
                            if matches:
                                candidate_ids.append(candidate_id)
                    except (ValueError, TypeError):
                        continue

            # House ownership filter
            elif filter_type == 'house_ownership':
                candidates = db.session.query(IncomeInfo.candidate_id).filter(
                    IncomeInfo.house_ownership == filter_value
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            # District filter
            elif filter_type == 'district':
                candidates = db.session.query(IncomeInfo.candidate_id).filter(
                    IncomeInfo.district == filter_value
                ).all()
                candidate_ids = [c[0] for c in candidates if c[0]]

            else:
                return jsonify({'msg': f'Unknown filter_type: {filter_type}'}), 400

            return jsonify({
                'filter_type': filter_type,
                'filter_value': filter_value,
                'candidate_ids': candidate_ids,
                'count': len(candidate_ids)
            }), 200

        except Exception as e:
            return jsonify({'msg': f'Failed to get candidate IDs: {str(e)}'}), 500

    # ===== Widget Agent Endpoints =====

    @app.route('/admin/widgets/agent/generate', methods=['POST'])
    @admin_required
    def generate_widget_with_agent():
        """Generate widget configuration using AI from natural language prompt"""
        from widget_agent import generate_widget_config

        data = request.get_json() or {}
        prompt = data.get('prompt')
        provider = data.get('provider', 'local')  # 'local', 'anthropic', or 'openai'

        if not prompt:
            return jsonify({'msg': 'prompt is required'}), 400

        # Get parameters based on provider
        api_key = data.get('api_key')
        ollama_url = data.get('ollama_url')
        ollama_model = data.get('ollama_model')

        result = generate_widget_config(
            prompt=prompt,
            provider=provider,
            api_key=api_key,
            ollama_url=ollama_url,
            ollama_model=ollama_model
        )

        if result['success']:
            # Include the query config separately for display/editing in UI
            result['query_config'] = result['config'].get('config_json', {})

            # Also preview the data with the generated config
            try:
                preview_result = execute_widget_query(result['config']['config_json'])
                result['preview_data'] = preview_result.get('data', [])[:10]  # Limit preview to 10 rows
                result['preview_row_count'] = preview_result.get('row_count', 0)
            except Exception as e:
                result['preview_error'] = str(e)

            return jsonify(result), 200
        else:
            return jsonify(result), 400

    @app.route('/admin/widgets/agent/refine', methods=['POST'])
    @admin_required
    def refine_widget_with_agent():
        """Refine existing widget configuration using AI based on feedback"""
        from widget_agent import refine_widget_config

        data = request.get_json() or {}
        current_config = data.get('current_config')
        feedback = data.get('feedback')
        provider = data.get('provider', 'local')

        if not current_config:
            return jsonify({'msg': 'current_config is required'}), 400
        if not feedback:
            return jsonify({'msg': 'feedback is required'}), 400

        api_key = data.get('api_key')
        ollama_url = data.get('ollama_url')
        ollama_model = data.get('ollama_model')

        result = refine_widget_config(
            current_config=current_config,
            feedback=feedback,
            provider=provider,
            api_key=api_key,
            ollama_url=ollama_url,
            ollama_model=ollama_model
        )

        if result['success']:
            # Include the query config separately for display/editing in UI
            result['query_config'] = result['config'].get('config_json', {})

            # Also preview the data with the refined config
            try:
                preview_result = execute_widget_query(result['config']['config_json'])
                result['preview_data'] = preview_result.get('data', [])[:10]
                result['preview_row_count'] = preview_result.get('row_count', 0)
            except Exception as e:
                result['preview_error'] = str(e)

            return jsonify(result), 200
        else:
            return jsonify(result), 400

    @app.route('/admin/widgets/agent/execute', methods=['POST'])
    @admin_required
    def execute_edited_widget_query():
        """Execute a manually edited widget query configuration"""
        data = request.get_json() or {}
        config_json = data.get('config_json')

        if not config_json:
            return jsonify({'msg': 'config_json is required'}), 400

        try:
            # Validate and execute the query
            preview_result = execute_widget_query(config_json)
            return jsonify({
                'success': True,
                'data': preview_result.get('data', [])[:100],  # Limit to 100 rows for preview
                'row_count': preview_result.get('row_count', 0)
            }), 200
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Query execution failed: {str(e)}'
            }), 500

    @app.route('/admin/widgets/agent/providers', methods=['GET'])
    @admin_required
    def get_ai_providers():
        """Get available AI providers and their status"""
        from widget_agent import check_ollama_status

        # Check Ollama status
        ollama_status = check_ollama_status()

        # Check API keys
        anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        openai_key = os.getenv('OPENAI_API_KEY')

        return jsonify({
            'providers': [
                {
                    'id': 'local',
                    'name': 'Local (Ollama)',
                    'description': 'Run AI locally using Ollama',
                    'available': ollama_status.get('running', False),
                    'has_model': ollama_status.get('has_model', False),
                    'model': ollama_status.get('model', 'qwen2.5-coder:7b'),
                    'available_models': ollama_status.get('available_models', []),
                    'error': ollama_status.get('error'),
                    'requires_api_key': False
                },
                {
                    'id': 'anthropic',
                    'name': 'Claude (Anthropic)',
                    'description': 'Use Claude AI via Anthropic API',
                    'available': True,
                    'configured': bool(anthropic_key),
                    'requires_api_key': True,
                    'key_prefix': 'sk-ant-'
                },
                {
                    'id': 'openai',
                    'name': 'GPT (OpenAI)',
                    'description': 'Use GPT-4 via OpenAI API',
                    'available': True,
                    'configured': bool(openai_key),
                    'requires_api_key': True,
                    'key_prefix': 'sk-'
                }
            ]
        }), 200

    # ==================== Volunteer Check-in APIs ====================

    @app.route('/admin/checkin/search', methods=['POST'])
    @jwt_required()
    def search_candidate_for_checkin():
        """Search for a candidate by last 4 digits of candidate ID or full candidate ID"""
        data = request.get_json() or {}
        search_term = data.get('search_term', '').strip()

        if not search_term:
            return jsonify({'msg': 'search_term is required'}), 400

        if len(search_term) < 4:
            return jsonify({'msg': 'Please enter at least 4 characters'}), 400

        # Search by candidate_id ending with the search term, exact match, or by uuid (from QR code)
        candidates = Application.query.join(BasicInfo).filter(
            db.or_(
                Application.candidate_id.endswith(search_term),
                Application.candidate_id == search_term,
                Application.uuid == search_term  # QR code contains uuid
            )
        ).all()

        if not candidates:
            return jsonify({'msg': 'No candidate found', 'candidates': []}), 200

        result = []
        for app in candidates:
            basic = app.basic_info
            result.append({
                'candidate_id': app.candidate_id,
                'full_name': basic.full_name if basic else 'N/A',
                'college_name': app.educational_info.college_name if app.educational_info else 'N/A',
                'department': app.educational_info.department if app.educational_info else 'N/A',
                'appeared_for_one_to_one': basic.appeared_for_one_to_one if basic else False,
                'appeared_marked_at': basic.appeared_marked_at.isoformat() if basic and basic.appeared_marked_at else None
            })

        return jsonify({'candidates': result}), 200

    @app.route('/admin/checkin/mark-appeared', methods=['PUT'])
    @jwt_required()
    def mark_candidate_appeared():
        """Mark a candidate as appeared for one-to-one"""
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        candidate_id = data.get('candidate_id')
        appeared = data.get('appeared', True)

        if not candidate_id:
            return jsonify({'msg': 'candidate_id is required'}), 400

        app = Application.query.filter_by(candidate_id=candidate_id).first()
        if not app:
            return jsonify({'msg': 'Candidate not found'}), 404

        basic = app.basic_info
        if not basic:
            return jsonify({'msg': 'Basic info not found for candidate'}), 404

        # Update appeared status
        basic.appeared_for_one_to_one = appeared
        if appeared:
            basic.appeared_marked_by = current_user_id
            basic.appeared_marked_at = datetime.utcnow()
        else:
            basic.appeared_marked_by = None
            basic.appeared_marked_at = None

        db.session.commit()

        return jsonify({
            'msg': f'Candidate {candidate_id} marked as {"appeared" if appeared else "not appeared"}',
            'candidate_id': candidate_id,
            'full_name': basic.full_name,
            'appeared_for_one_to_one': basic.appeared_for_one_to_one,
            'appeared_marked_at': basic.appeared_marked_at.isoformat() if basic.appeared_marked_at else None
        }), 200

    @app.route('/admin/checkin/stats', methods=['GET'])
    @jwt_required()
    def get_checkin_stats():
        """Get check-in statistics"""
        total_shortlisted = BasicInfo.query.filter_by(shortlisted=True).count()
        total_appeared = BasicInfo.query.filter_by(appeared_for_one_to_one=True).count()
        shortlisted_appeared = BasicInfo.query.filter_by(shortlisted=True, appeared_for_one_to_one=True).count()

        return jsonify({
            'total_shortlisted': total_shortlisted,
            'total_appeared': total_appeared,
            'shortlisted_appeared': shortlisted_appeared,
            'pending': total_shortlisted - shortlisted_appeared
        }), 200

    @app.route('/admin/checkin/recent', methods=['GET'])
    @jwt_required()
    def get_recent_checkins():
        """Get recent check-ins"""
        limit = request.args.get('limit', 10, type=int)

        recent = BasicInfo.query.filter_by(appeared_for_one_to_one=True)\
            .order_by(BasicInfo.appeared_marked_at.desc())\
            .limit(limit)\
            .all()

        result = []
        for basic in recent:
            app = Application.query.filter_by(candidate_id=basic.candidate_id).first()
            result.append({
                'candidate_id': basic.candidate_id,
                'full_name': basic.full_name,
                'college_name': app.educational_info.college_name if app and app.educational_info else 'N/A',
                'appeared_marked_at': basic.appeared_marked_at.isoformat() if basic.appeared_marked_at else None
            })

        return jsonify({'recent_checkins': result}), 200

    # =====================
    # Email Verification Endpoints
    # =====================

    @app.route('/admin/email/config', methods=['GET'])
    @admin_required
    def get_email_config():
        """Check if email service is configured"""
        from email_service import email_service
        return jsonify({
            'configured': email_service.is_configured(),
            'smtp_host': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
            'from_email': os.getenv('FROM_EMAIL', os.getenv('SMTP_USER', ''))
        }), 200

    @app.route('/admin/email/send/<candidate_id>', methods=['POST'])
    @admin_required
    def send_verification_email(candidate_id):
        """Send verification email to a single candidate"""
        from email_service import email_service

        # Find the application
        app_record = Application.query.filter_by(candidate_id=candidate_id).first()
        if not app_record:
            return jsonify({'msg': 'Application not found'}), 404

        basic_info = app_record.basic_info
        if not basic_info:
            return jsonify({'msg': 'Basic info not found'}), 404

        if not basic_info.email:
            return jsonify({'msg': 'No email address found for candidate'}), 400

        # Send email
        success, error = email_service.send_verification_email(
            to_email=basic_info.email,
            candidate_name=basic_info.full_name,
            candidate_id=candidate_id
        )

        # Update database
        basic_info.email_sent_at = datetime.utcnow()
        if success:
            basic_info.email_verified = True
            basic_info.email_verified_at = datetime.utcnow()
            basic_info.email_error = None
        else:
            basic_info.email_verified = False
            basic_info.email_error = error

        db.session.commit()

        return jsonify({
            'success': success,
            'candidate_id': candidate_id,
            'email': basic_info.email,
            'error': error
        }), 200 if success else 500

    @app.route('/admin/email/send-bulk', methods=['POST'])
    @admin_required
    def send_bulk_verification_emails():
        """Send verification emails to multiple candidates"""
        from email_service import email_service

        data = request.get_json() or {}
        candidate_ids = data.get('candidate_ids', [])

        # If no specific IDs provided, get all candidates without email verification
        if not candidate_ids:
            filter_type = data.get('filter', 'not_sent')  # not_sent, failed, all

            query = BasicInfo.query.filter(BasicInfo.email.isnot(None), BasicInfo.email != '')

            if filter_type == 'not_sent':
                query = query.filter(BasicInfo.email_verified.is_(None))
            elif filter_type == 'failed':
                query = query.filter(BasicInfo.email_verified == False)

            candidates_to_email = query.all()
            candidate_ids = [c.candidate_id for c in candidates_to_email]

        if not candidate_ids:
            return jsonify({'msg': 'No candidates to email'}), 400

        # Prepare candidate data
        candidates = []
        for cid in candidate_ids:
            basic_info = BasicInfo.query.filter_by(candidate_id=cid).first()
            if basic_info and basic_info.email:
                candidates.append({
                    'candidate_id': cid,
                    'email': basic_info.email,
                    'name': basic_info.full_name
                })

        # Send emails
        results = email_service.send_bulk_verification_emails(candidates)

        # Update database for each result
        for cid in results['success']:
            basic_info = BasicInfo.query.filter_by(candidate_id=cid).first()
            if basic_info:
                basic_info.email_sent_at = datetime.utcnow()
                basic_info.email_verified = True
                basic_info.email_verified_at = datetime.utcnow()
                basic_info.email_error = None

        for cid in results['failed']:
            basic_info = BasicInfo.query.filter_by(candidate_id=cid).first()
            if basic_info:
                basic_info.email_sent_at = datetime.utcnow()
                basic_info.email_verified = False
                basic_info.email_error = results['errors'].get(cid)

        db.session.commit()

        return jsonify({
            'total': len(candidates),
            'success_count': len(results['success']),
            'failed_count': len(results['failed']),
            'success': results['success'],
            'failed': results['failed'],
            'errors': results['errors']
        }), 200

    @app.route('/admin/email/stats', methods=['GET'])
    @admin_required
    def get_email_stats():
        """Get email verification statistics"""
        total = BasicInfo.query.count()
        with_email = BasicInfo.query.filter(BasicInfo.email.isnot(None), BasicInfo.email != '').count()
        verified = BasicInfo.query.filter(BasicInfo.email_verified == True).count()
        failed = BasicInfo.query.filter(BasicInfo.email_verified == False).count()
        not_sent = BasicInfo.query.filter(BasicInfo.email_verified.is_(None)).count()

        return jsonify({
            'total_candidates': total,
            'with_email': with_email,
            'verified': verified,
            'failed': failed,
            'not_sent': not_sent
        }), 200

    @app.route('/admin/email/candidates', methods=['GET'])
    @admin_required
    def get_email_candidates():
        """Get list of candidates with email status"""
        status = request.args.get('status', 'all')  # all, verified, failed, not_sent
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = BasicInfo.query.filter(BasicInfo.email.isnot(None), BasicInfo.email != '')

        if status == 'verified':
            query = query.filter(BasicInfo.email_verified == True)
        elif status == 'failed':
            query = query.filter(BasicInfo.email_verified == False)
        elif status == 'not_sent':
            query = query.filter(BasicInfo.email_verified.is_(None))

        query = query.order_by(BasicInfo.email_sent_at.desc().nullsfirst())

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        candidates = []
        for basic in paginated.items:
            candidates.append({
                'candidate_id': basic.candidate_id,
                'full_name': basic.full_name,
                'email': basic.email,
                'email_verified': basic.email_verified,
                'email_sent_at': basic.email_sent_at.isoformat() if basic.email_sent_at else None,
                'email_verified_at': basic.email_verified_at.isoformat() if basic.email_verified_at else None,
                'email_error': basic.email_error
            })

        return jsonify({
            'candidates': candidates,
            'page': page,
            'pages': paginated.pages,
            'total': paginated.total
        }), 200

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5001)), debug=True)
