"""
Helper functions for handling normalized application data
"""

from datetime import datetime
from models import db, Application, BasicInfo, EducationalInfo, FamilyInfo, IncomeInfo, CourseInfo


def extract_field_value(section_data, field_name):
    """Extract field value from section data array"""
    for item in section_data:
        if field_name in item:
            return item[field_name]
    return None


def save_normalized_application(structured_data, candidate_id, uuid, form_config_id=None):
    """
    Save form submission to normalized database tables

    Args:
        structured_data: Dict with section keys containing arrays of field objects
        candidate_id: Generated candidate ID
        uuid: Generated UUID
        form_config_id: Form configuration ID (optional)

    Returns:
        Application object
    """

    # Create main application record
    application = Application(
        uuid=uuid,
        candidate_id=candidate_id,
        form_config_id=form_config_id,
        status='submitted'
    )
    db.session.add(application)
    db.session.flush()  # Get application.candidate_id without committing

    # Extract and save basic_info
    basic_data = structured_data.get('basic_info', [])
    basic_info = BasicInfo(
        candidate_id=application.candidate_id,
        full_name=extract_field_value(basic_data, 'full_name') or '',
        dob=datetime.strptime(extract_field_value(basic_data, 'dob'), '%Y-%m-%d').date() if extract_field_value(basic_data, 'dob') else None,
        gender=extract_field_value(basic_data, 'gender') or '',
        email=extract_field_value(basic_data, 'email') or '',
        differently_abled=extract_field_value(basic_data, 'differently_abled') or False,
        contact=extract_field_value(basic_data, 'contact') or '',
        contact_as_whatsapp=extract_field_value(basic_data, 'contact_as_whatsapp') or False,
        whatsapp_contact=extract_field_value(basic_data, 'whatsapp_contact'),
        has_laptop=extract_field_value(basic_data, 'has_laptop') or False,
        laptop_ram=extract_field_value(basic_data, 'laptop_ram'),
        laptop_processor=extract_field_value(basic_data, 'laptop_processor')
    )
    db.session.add(basic_info)

    # Extract and save educational_info
    edu_data = structured_data.get('educational_info', [])
    educational_info = EducationalInfo(
        candidate_id=application.candidate_id,
        college_name=extract_field_value(edu_data, 'college_name') or '',
        degree=extract_field_value(edu_data, 'degree') or '',
        department=extract_field_value(edu_data, 'department') or '',
        year=extract_field_value(edu_data, 'year') or '',
        tamil_medium=extract_field_value(edu_data, 'tamil_medium') or False,
        six_to_8_govt_school=extract_field_value(edu_data, '6_to_8_govt_school') or False,
        six_to_8_school_name=extract_field_value(edu_data, '6_to_8_school_name') or '',
        nine_to_10_govt_school=extract_field_value(edu_data, '9_to_10_govt_school') or False,
        nine_to_10_school_name=extract_field_value(edu_data, '9_to_10_school_name') or '',
        eleven_to_12_govt_school=extract_field_value(edu_data, '11_to_12_govt_school') or False,
        eleven_to_12_school_name=extract_field_value(edu_data, '11_to_12_school_name') or '',
        present_work=extract_field_value(edu_data, 'present_work'),
        received_scholarship=extract_field_value(edu_data, 'received_scholarship') or False,
        scholarship_details=extract_field_value(edu_data, 'scholarship_details'),
        transport_mode=extract_field_value(edu_data, 'transport_mode') or '',
        vglug_applied_before=extract_field_value(edu_data, 'vglug_applied_before') or ''
    )
    db.session.add(educational_info)

    # Extract and save family_info
    family_data = structured_data.get('family_info', [])
    family_info = FamilyInfo(
        candidate_id=application.candidate_id,
        family_environment=extract_field_value(family_data, 'family_environment') or '',
        single_parent_info=extract_field_value(family_data, 'single_parent_info'),
        family_members_count=int(extract_field_value(family_data, 'family_members_count') or 0),
        family_members_details=extract_field_value(family_data, 'family_members_details') or '',
        earning_members_count=int(extract_field_value(family_data, 'earning_members_count') or 0),
        earning_members_details=extract_field_value(family_data, 'earning_members_details') or '',
        guardian_details=extract_field_value(family_data, 'guardian_details')
    )
    db.session.add(family_info)

    # Extract and save income_info
    income_data = structured_data.get('income_info', [])
    income_info = IncomeInfo(
        candidate_id=application.candidate_id,
        total_family_income=extract_field_value(income_data, 'total_family_income'),
        own_land=extract_field_value(income_data, 'own_land') or False,
        own_land_size=extract_field_value(income_data, 'own_land_size'),
        house_ownership=extract_field_value(income_data, 'house_ownership') or '',
        full_address=extract_field_value(income_data, 'full_address') or '',
        pincode=extract_field_value(income_data, 'pincode') or '',
        district=extract_field_value(income_data, 'district') or ''
    )
    db.session.add(income_info)

    # Extract and save course_info
    course_data = structured_data.get('course_info', [])
    course_info = CourseInfo(
        candidate_id=application.candidate_id,
        preferred_course=extract_field_value(course_data, 'preferred_course') or '',
        training_benefit=extract_field_value(course_data, 'training_benefit') or '',
        heard_about_vglug=extract_field_value(course_data, 'heard_about_vglug') or False,
        participated_in_vglug_events=extract_field_value(course_data, 'participated_in_vglug_events') or False
    )
    db.session.add(course_info)

    # Commit all changes
    db.session.commit()

    return application


def get_application_with_details(application_id):
    """
    Retrieve complete application with all related data

    Args:
        application_id: Application ID or UUID

    Returns:
        Dict with all application data
    """

    # Try to find by ID or UUID
    if isinstance(application_id, int):
        application = Application.query.get(application_id)
    else:
        application = Application.query.filter_by(uuid=application_id).first()

    if not application:
        return None

    return {
        'application': {
            'id': application.id,
            'uuid': application.uuid,
            'candidate_id': application.candidate_id,
            'status': application.status,
            'created_at': application.created_at.isoformat(),
            'updated_at': application.updated_at.isoformat()
        },
        'basic_info': {
            'full_name': application.basic_info.full_name,
            'dob': application.basic_info.dob.isoformat(),
            'gender': application.basic_info.gender,
            'email': application.basic_info.email,
            'differently_abled': application.basic_info.differently_abled,
            'contact': application.basic_info.contact,
            'contact_as_whatsapp': application.basic_info.contact_as_whatsapp,
            'whatsapp_contact': application.basic_info.whatsapp_contact,
            'has_laptop': application.basic_info.has_laptop,
            'laptop_ram': application.basic_info.laptop_ram,
            'laptop_processor': application.basic_info.laptop_processor
        },
        'educational_info': {
            'college_name': application.educational_info.college_name,
            'degree': application.educational_info.degree,
            'department': application.educational_info.department,
            'year': application.educational_info.year,
            'tamil_medium': application.educational_info.tamil_medium,
            '6_to_8_govt_school': application.educational_info.six_to_8_govt_school,
            '6_to_8_school_name': application.educational_info.six_to_8_school_name,
            '9_to_10_govt_school': application.educational_info.nine_to_10_govt_school,
            '9_to_10_school_name': application.educational_info.nine_to_10_school_name,
            '11_to_12_govt_school': application.educational_info.eleven_to_12_govt_school,
            '11_to_12_school_name': application.educational_info.eleven_to_12_school_name,
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
            'own_land': application.income_info.own_land,
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


def update_normalized_application(candidate_id, structured_data):
    """
    Update existing application data from structured form submission

    Args:
        candidate_id: The candidate ID to update
        structured_data: Dict with section keys containing arrays of field objects

    Returns:
        Application object
    """
    from datetime import datetime

    # Get the application
    application = Application.query.filter_by(candidate_id=candidate_id).first()
    if not application:
        raise ValueError(f'Application not found: {candidate_id}')

    # Update basic_info (except email which is locked)
    basic_data = structured_data.get('basic_info', [])
    if application.basic_info and basic_data:
        bi = application.basic_info
        # Do NOT update email - it's verified and locked
        if extract_field_value(basic_data, 'full_name') is not None:
            bi.full_name = extract_field_value(basic_data, 'full_name') or bi.full_name
        if extract_field_value(basic_data, 'dob') is not None:
            dob_str = extract_field_value(basic_data, 'dob')
            if dob_str:
                bi.dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
        if extract_field_value(basic_data, 'gender') is not None:
            bi.gender = extract_field_value(basic_data, 'gender') or bi.gender
        if extract_field_value(basic_data, 'differently_abled') is not None:
            bi.differently_abled = extract_field_value(basic_data, 'differently_abled')
        if extract_field_value(basic_data, 'contact') is not None:
            bi.contact = extract_field_value(basic_data, 'contact') or bi.contact
        if extract_field_value(basic_data, 'contact_as_whatsapp') is not None:
            bi.contact_as_whatsapp = extract_field_value(basic_data, 'contact_as_whatsapp')
        if extract_field_value(basic_data, 'whatsapp_contact') is not None:
            bi.whatsapp_contact = extract_field_value(basic_data, 'whatsapp_contact')
        if extract_field_value(basic_data, 'has_laptop') is not None:
            bi.has_laptop = extract_field_value(basic_data, 'has_laptop')
        if extract_field_value(basic_data, 'laptop_ram') is not None:
            bi.laptop_ram = extract_field_value(basic_data, 'laptop_ram')
        if extract_field_value(basic_data, 'laptop_processor') is not None:
            bi.laptop_processor = extract_field_value(basic_data, 'laptop_processor')

    # Update educational_info
    edu_data = structured_data.get('educational_info', [])
    if application.educational_info and edu_data:
        ei = application.educational_info
        if extract_field_value(edu_data, 'college_name') is not None:
            ei.college_name = extract_field_value(edu_data, 'college_name') or ei.college_name
        if extract_field_value(edu_data, 'degree') is not None:
            ei.degree = extract_field_value(edu_data, 'degree') or ei.degree
        if extract_field_value(edu_data, 'department') is not None:
            ei.department = extract_field_value(edu_data, 'department') or ei.department
        if extract_field_value(edu_data, 'year') is not None:
            ei.year = extract_field_value(edu_data, 'year') or ei.year
        if extract_field_value(edu_data, 'tamil_medium') is not None:
            ei.tamil_medium = extract_field_value(edu_data, 'tamil_medium')
        if extract_field_value(edu_data, '6_to_8_govt_school') is not None:
            ei.six_to_8_govt_school = extract_field_value(edu_data, '6_to_8_govt_school')
        if extract_field_value(edu_data, '6_to_8_school_name') is not None:
            ei.six_to_8_school_name = extract_field_value(edu_data, '6_to_8_school_name')
        if extract_field_value(edu_data, '9_to_10_govt_school') is not None:
            ei.nine_to_10_govt_school = extract_field_value(edu_data, '9_to_10_govt_school')
        if extract_field_value(edu_data, '9_to_10_school_name') is not None:
            ei.nine_to_10_school_name = extract_field_value(edu_data, '9_to_10_school_name')
        if extract_field_value(edu_data, '11_to_12_govt_school') is not None:
            ei.eleven_to_12_govt_school = extract_field_value(edu_data, '11_to_12_govt_school')
        if extract_field_value(edu_data, '11_to_12_school_name') is not None:
            ei.eleven_to_12_school_name = extract_field_value(edu_data, '11_to_12_school_name')
        if extract_field_value(edu_data, 'present_work') is not None:
            ei.present_work = extract_field_value(edu_data, 'present_work')
        if extract_field_value(edu_data, 'received_scholarship') is not None:
            ei.received_scholarship = extract_field_value(edu_data, 'received_scholarship')
        if extract_field_value(edu_data, 'scholarship_details') is not None:
            ei.scholarship_details = extract_field_value(edu_data, 'scholarship_details')
        if extract_field_value(edu_data, 'transport_mode') is not None:
            ei.transport_mode = extract_field_value(edu_data, 'transport_mode')
        if extract_field_value(edu_data, 'vglug_applied_before') is not None:
            ei.vglug_applied_before = extract_field_value(edu_data, 'vglug_applied_before')

    # Update family_info
    family_data = structured_data.get('family_info', [])
    if application.family_info and family_data:
        fi = application.family_info
        if extract_field_value(family_data, 'family_environment') is not None:
            fi.family_environment = extract_field_value(family_data, 'family_environment') or fi.family_environment
        if extract_field_value(family_data, 'single_parent_info') is not None:
            fi.single_parent_info = extract_field_value(family_data, 'single_parent_info')
        if extract_field_value(family_data, 'family_members_count') is not None:
            fi.family_members_count = int(extract_field_value(family_data, 'family_members_count') or 0)
        if extract_field_value(family_data, 'family_members_details') is not None:
            fi.family_members_details = extract_field_value(family_data, 'family_members_details') or fi.family_members_details
        if extract_field_value(family_data, 'earning_members_count') is not None:
            fi.earning_members_count = int(extract_field_value(family_data, 'earning_members_count') or 0)
        if extract_field_value(family_data, 'earning_members_details') is not None:
            fi.earning_members_details = extract_field_value(family_data, 'earning_members_details') or fi.earning_members_details
        if extract_field_value(family_data, 'guardian_details') is not None:
            fi.guardian_details = extract_field_value(family_data, 'guardian_details')

    # Update income_info
    income_data = structured_data.get('income_info', [])
    if application.income_info and income_data:
        ii = application.income_info
        if extract_field_value(income_data, 'total_family_income') is not None:
            ii.total_family_income = extract_field_value(income_data, 'total_family_income')
        if extract_field_value(income_data, 'own_land') is not None:
            ii.own_land = extract_field_value(income_data, 'own_land')
        if extract_field_value(income_data, 'own_land_size') is not None:
            ii.own_land_size = extract_field_value(income_data, 'own_land_size')
        if extract_field_value(income_data, 'house_ownership') is not None:
            ii.house_ownership = extract_field_value(income_data, 'house_ownership') or ii.house_ownership
        if extract_field_value(income_data, 'full_address') is not None:
            ii.full_address = extract_field_value(income_data, 'full_address') or ii.full_address
        if extract_field_value(income_data, 'pincode') is not None:
            ii.pincode = extract_field_value(income_data, 'pincode') or ii.pincode
        if extract_field_value(income_data, 'district') is not None:
            ii.district = extract_field_value(income_data, 'district') or ii.district

    # Update course_info
    course_data = structured_data.get('course_info', [])
    if application.course_info and course_data:
        ci = application.course_info
        if extract_field_value(course_data, 'preferred_course') is not None:
            ci.preferred_course = extract_field_value(course_data, 'preferred_course') or ci.preferred_course
        if extract_field_value(course_data, 'training_benefit') is not None:
            ci.training_benefit = extract_field_value(course_data, 'training_benefit') or ci.training_benefit
        if extract_field_value(course_data, 'heard_about_vglug') is not None:
            ci.heard_about_vglug = extract_field_value(course_data, 'heard_about_vglug')
        if extract_field_value(course_data, 'participated_in_vglug_events') is not None:
            ci.participated_in_vglug_events = extract_field_value(course_data, 'participated_in_vglug_events')

    # Update timestamp
    application.updated_at = datetime.utcnow()

    db.session.commit()

    return application
