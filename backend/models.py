from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """Admin user for managing forms (not for applicants - application is anonymous)"""
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='volunteer', nullable=False, index=True)  # admin, volunteer, panel_member
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Role constants
    ROLE_ADMIN = 'admin'
    ROLE_VOLUNTEER = 'volunteer'
    ROLE_PANEL_MEMBER = 'panel_member'

    def is_admin(self):
        return self.role == self.ROLE_ADMIN

    def is_panel_member(self):
        return self.role == self.ROLE_PANEL_MEMBER

    def is_volunteer(self):
        return self.role == self.ROLE_VOLUNTEER

    def can_edit_applications(self):
        """Admin and panel_member can edit applications"""
        return self.role in [self.ROLE_ADMIN, self.ROLE_PANEL_MEMBER]

    def can_manage_forms(self):
        """Only admin can manage form configurations"""
        return self.role == self.ROLE_ADMIN

    def can_view_applications(self):
        """All roles can view applications"""
        return True

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class FormConfig(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    config_json = db.Column(db.JSON, nullable=False)
    year = db.Column(db.Integer, nullable=False, index=True)
    version = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('year', 'version', name='uq_form_config_year_version'),
        db.Index('idx_year_active', 'year', 'is_active'),
    )


class ValidationSchema(db.Model):
    """Validation schema configuration for forms"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    schema_json = db.Column(db.JSON, nullable=False)
    year = db.Column(db.Integer, nullable=False, index=True)
    version = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('year', 'version', name='uq_validation_schema_year_version'),
        db.Index('idx_validation_year_active', 'year', 'is_active'),
    )


class Application(db.Model):
    """Main application record - normalized submission"""
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, index=True)
    candidate_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    form_config_id = db.Column(db.Integer, db.ForeignKey('form_config.id'), nullable=True)
    status = db.Column(db.String(20), default='submitted', nullable=False, index=True)  # submitted, reviewed, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships (join on candidate_id instead of id)
    basic_info = db.relationship('BasicInfo', backref='application', uselist=False, cascade='all, delete-orphan',
                                  primaryjoin='Application.candidate_id==BasicInfo.candidate_id')
    educational_info = db.relationship('EducationalInfo', backref='application', uselist=False, cascade='all, delete-orphan',
                                       primaryjoin='Application.candidate_id==EducationalInfo.candidate_id')
    family_info = db.relationship('FamilyInfo', backref='application', uselist=False, cascade='all, delete-orphan',
                                   primaryjoin='Application.candidate_id==FamilyInfo.candidate_id')
    income_info = db.relationship('IncomeInfo', backref='application', uselist=False, cascade='all, delete-orphan',
                                   primaryjoin='Application.candidate_id==IncomeInfo.candidate_id')
    course_info = db.relationship('CourseInfo', backref='application', uselist=False, cascade='all, delete-orphan',
                                   primaryjoin='Application.candidate_id==CourseInfo.candidate_id')

    __table_args__ = (
        db.Index('idx_status_created', 'status', 'created_at'),
        db.Index('idx_candidate_id_status', 'candidate_id', 'status'),
    )


class BasicInfo(db.Model):
    """Personal Details / தனிப்பட்ட விவரங்கள்"""
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.String(20), db.ForeignKey('application.candidate_id'), nullable=False, unique=True, index=True)

    full_name = db.Column(db.String(255), nullable=False, index=True)
    dob = db.Column(db.Date, nullable=False, index=True)
    gender = db.Column(db.String(50), nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    differently_abled = db.Column(db.Boolean, nullable=False, default=False, index=True)
    contact = db.Column(db.String(20), nullable=False, index=True)
    contact_as_whatsapp = db.Column(db.Boolean, nullable=False, default=False)
    whatsapp_contact = db.Column(db.String(20), nullable=True)
    has_laptop = db.Column(db.Boolean, nullable=False, default=False, index=True)
    laptop_ram = db.Column(db.String(50), nullable=True)
    laptop_processor = db.Column(db.String(100), nullable=True)

    # Panel member review fields
    considered = db.Column(db.Boolean, nullable=True, index=True)
    selected = db.Column(db.Boolean, nullable=True, index=True)
    shortlisted = db.Column(db.Boolean, nullable=True, default=False, index=True)
    shortlisted_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True, index=True)
    shortlisted_at = db.Column(db.DateTime, nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True, index=True)

    # Volunteer check-in fields
    appeared_for_one_to_one = db.Column(db.Boolean, nullable=False, default=False, index=True)
    appeared_marked_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True, index=True)
    appeared_marked_at = db.Column(db.DateTime, nullable=True)

    # Email status fields
    # email_verified: None=not attempted, True=SMTP accepted (may still bounce), False=failed/bounced
    # IMPORTANT: True does NOT guarantee delivery - bounces happen asynchronously
    # To detect bounces, use a transactional email service (SendGrid, Mailgun, SES) with webhooks
    email_verified = db.Column(db.Boolean, nullable=True, index=True)
    email_sent_at = db.Column(db.DateTime, nullable=True)
    email_verified_at = db.Column(db.DateTime, nullable=True)  # When SMTP accepted the email
    email_error = db.Column(db.String(500), nullable=True)  # Store error message if email failed

    # Relationship to User for reviewed_by, shortlisted_by, and appeared_marked_by
    reviewer = db.relationship('User', backref='reviewed_applications', foreign_keys=[reviewed_by])
    shortlister = db.relationship('User', backref='shortlisted_applications', foreign_keys=[shortlisted_by])
    appeared_marker = db.relationship('User', backref='marked_appeared_applications', foreign_keys=[appeared_marked_by])

    __table_args__ = (
        db.Index('idx_name_email', 'full_name', 'email'),
        db.Index('idx_gender_abled', 'gender', 'differently_abled'),
        db.Index('idx_review_status', 'considered', 'selected'),
        db.Index('idx_shortlisted', 'shortlisted'),
    )


class EducationalInfo(db.Model):
    """Educational Details / கல்வி விவரங்கள்"""
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.String(20), db.ForeignKey('application.candidate_id'), nullable=False, unique=True, index=True)

    college_name = db.Column(db.String(255), nullable=False, index=True)
    degree = db.Column(db.String(100), nullable=False, index=True)
    department = db.Column(db.String(100), nullable=False, index=True)
    year = db.Column(db.String(50), nullable=False, index=True)
    tamil_medium = db.Column(db.Boolean, nullable=False, default=False, index=True)

    # Schooling history (6th to 8th)
    six_to_8_govt_school = db.Column(db.Boolean, nullable=False, default=False)
    six_to_8_school_name = db.Column(db.String(255), nullable=False)

    # Schooling history (9th to 10th)
    nine_to_10_govt_school = db.Column(db.Boolean, nullable=False, default=False)
    nine_to_10_school_name = db.Column(db.String(255), nullable=False)

    # Schooling history (11th to 12th)
    eleven_to_12_govt_school = db.Column(db.Boolean, nullable=False, default=False)
    eleven_to_12_school_name = db.Column(db.String(255), nullable=False)

    # Additional info
    present_work = db.Column(db.String(255), nullable=True)
    received_scholarship = db.Column(db.Boolean, nullable=False, default=False, index=True)
    scholarship_details = db.Column(db.Text, nullable=True)
    transport_mode = db.Column(db.String(50), nullable=False, index=True)
    vglug_applied_before = db.Column(db.String(50), nullable=False, index=True)

    __table_args__ = (
        db.Index('idx_college_dept', 'college_name', 'department'),
        db.Index('idx_degree_year', 'degree', 'year'),
        db.Index('idx_scholarship_transport', 'received_scholarship', 'transport_mode'),
    )


class FamilyInfo(db.Model):
    """Family Information / குடும்ப தகவல்"""
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.String(20), db.ForeignKey('application.candidate_id'), nullable=False, unique=True, index=True)

    family_environment = db.Column(db.String(100), nullable=False, index=True)
    single_parent_info = db.Column(db.String(100), nullable=True, index=True)
    family_members_count = db.Column(db.Integer, nullable=False, index=True)
    family_members_details = db.Column(db.Text, nullable=False)
    earning_members_count = db.Column(db.Integer, nullable=False, index=True)
    earning_members_details = db.Column(db.Text, nullable=False)
    guardian_details = db.Column(db.Text, nullable=True)

    __table_args__ = (
        db.Index('idx_family_env_single', 'family_environment', 'single_parent_info'),
        db.Index('idx_members_earning', 'family_members_count', 'earning_members_count'),
    )


class IncomeInfo(db.Model):
    """Income & Housing Information / வருமானம் மற்றும் வீடு தகவல்"""
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.String(20), db.ForeignKey('application.candidate_id'), nullable=False, unique=True, index=True)

    total_family_income = db.Column(db.String(100), nullable=True, index=True)
    own_land_size = db.Column(db.String(100), nullable=True)
    house_ownership = db.Column(db.String(100), nullable=False, index=True)
    full_address = db.Column(db.Text, nullable=False)
    pincode = db.Column(db.String(10), nullable=False, index=True)
    district = db.Column(db.String(100), nullable=False, index=True)

    __table_args__ = (
        db.Index('idx_district_pincode', 'district', 'pincode'),
        db.Index('idx_house_ownership', 'house_ownership'),
        db.Index('idx_total_family_income', 'total_family_income'),
    )


class CourseInfo(db.Model):
    """Course Preference / பயிற்சி விருப்பம்"""
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.String(20), db.ForeignKey('application.candidate_id'), nullable=False, unique=True, index=True)

    preferred_course = db.Column(db.String(100), nullable=False, index=True)
    training_benefit = db.Column(db.Text, nullable=False)
    heard_about_vglug = db.Column(db.Boolean, nullable=False, default=False, index=True)
    participated_in_vglug_events = db.Column(db.Boolean, nullable=False, default=False, index=True)

    __table_args__ = (
        db.Index('idx_course_heard', 'preferred_course', 'heard_about_vglug'),
        db.Index('idx_course_participated', 'preferred_course', 'participated_in_vglug_events'),
    )


class Widget(db.Model):
    """Custom dashboard widget configuration"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    widget_type = db.Column(db.String(50), nullable=False)  # 'pie', 'bar', 'line', 'number', 'table'
    config_json = db.Column(db.JSON, nullable=False)
    position = db.Column(db.Integer, default=0)
    width = db.Column(db.String(20), default='col-md-6')
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)

    creator = db.relationship('User', backref='created_widgets', foreign_keys=[created_by])

    __table_args__ = (
        db.Index('idx_widget_active_position', 'is_active', 'position'),
        db.Index('idx_widget_creator', 'created_by', 'is_active'),
    )


class EmailQueue(db.Model):
    """Email queue for background processing with Celery"""
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.String(20), db.ForeignKey('application.candidate_id'), nullable=False, index=True)
    to_email = db.Column(db.String(255), nullable=False)
    recipient_name = db.Column(db.String(255), nullable=False)
    email_type = db.Column(db.String(50), nullable=False, default='verification', index=True)  # verification, notification, etc.

    # Status tracking
    status = db.Column(db.String(20), nullable=False, default='pending', index=True)  # pending, processing, sent, failed
    retry_count = db.Column(db.Integer, nullable=False, default=0)
    max_retries = db.Column(db.Integer, nullable=False, default=3)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    processed_at = db.Column(db.DateTime, nullable=True)
    sent_at = db.Column(db.DateTime, nullable=True)

    # Error tracking
    error_message = db.Column(db.Text, nullable=True)
    last_error_at = db.Column(db.DateTime, nullable=True)

    # Celery task tracking
    celery_task_id = db.Column(db.String(100), nullable=True, index=True)

    __table_args__ = (
        db.Index('idx_email_queue_status_created', 'status', 'created_at'),
        db.Index('idx_email_queue_retry', 'status', 'retry_count'),
    )


class OTPVerification(db.Model):
    """OTP verification for email verification before form access"""
    __tablename__ = 'otp_verifications'

    id = db.Column(db.Integer, primary_key=True)
    phone_number = db.Column(db.String(15), nullable=True, index=True)  # Legacy, kept for compatibility
    email = db.Column(db.String(255), nullable=True, index=True)  # Email for OTP verification
    otp_code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    verified = db.Column(db.Boolean, default=False, index=True)
    attempts = db.Column(db.Integer, default=0)
    ip_address = db.Column(db.String(45), nullable=True)  # For rate limiting

    __table_args__ = (
        db.Index('idx_otp_phone_created', 'phone_number', 'created_at'),
        db.Index('idx_otp_email_created', 'email', 'created_at'),
        db.Index('idx_otp_expires', 'expires_at', 'verified'),
    )


class EditToken(db.Model):
    """Token for editing existing applications via email link"""
    __tablename__ = 'edit_tokens'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    candidate_id = db.Column(db.String(20), db.ForeignKey('application.candidate_id'), nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    used_at = db.Column(db.DateTime, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)

    __table_args__ = (
        db.Index('idx_edit_token_expires', 'expires_at', 'used'),
    )


# Legacy submission table (for backwards compatibility)
class Submission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False)
    candidate_id = db.Column(db.String(20), unique=True, nullable=False)
    data = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
