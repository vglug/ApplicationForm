-- VGLUG Application Form 2025 - Normalized Database Schema
-- This schema provides a properly normalized structure for storing application data

-- ============================================================================
-- TABLE: application
-- Main application record (anonymous - no user authentication)
-- ============================================================================
CREATE TABLE application (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    application_number VARCHAR(20) UNIQUE NOT NULL,
    form_config_id INTEGER REFERENCES form_config(id),
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for application table
CREATE INDEX idx_application_uuid ON application(uuid);
CREATE INDEX idx_application_number ON application(application_number);
CREATE INDEX idx_application_status ON application(status);
CREATE INDEX idx_application_created_at ON application(created_at);
CREATE INDEX idx_status_created ON application(status, created_at);
CREATE INDEX idx_app_number_status ON application(application_number, status);

-- ============================================================================
-- TABLE: basic_info
-- Personal Details / தனிப்பட்ட விவரங்கள்
-- 11 fields
-- ============================================================================
CREATE TABLE basic_info (
    id SERIAL PRIMARY KEY,
    application_id INTEGER UNIQUE NOT NULL REFERENCES application(id) ON DELETE CASCADE,

    -- Personal Information
    full_name VARCHAR(255) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    differently_abled BOOLEAN NOT NULL DEFAULT FALSE,

    -- Contact Information
    contact VARCHAR(20) NOT NULL,
    contact_as_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_contact VARCHAR(20),

    -- Laptop/Desktop Information
    has_laptop BOOLEAN NOT NULL DEFAULT FALSE,
    laptop_ram VARCHAR(50),
    laptop_processor VARCHAR(100)
);

-- Indexes for basic_info table
CREATE INDEX idx_basic_application_id ON basic_info(application_id);
CREATE INDEX idx_basic_full_name ON basic_info(full_name);
CREATE INDEX idx_basic_email ON basic_info(email);
CREATE INDEX idx_basic_contact ON basic_info(contact);
CREATE INDEX idx_basic_dob ON basic_info(dob);
CREATE INDEX idx_basic_gender ON basic_info(gender);
CREATE INDEX idx_basic_differently_abled ON basic_info(differently_abled);
CREATE INDEX idx_basic_has_laptop ON basic_info(has_laptop);
CREATE INDEX idx_name_email ON basic_info(full_name, email);
CREATE INDEX idx_gender_abled ON basic_info(gender, differently_abled);

-- ============================================================================
-- TABLE: educational_info
-- Educational Details / கல்வி விவரங்கள்
-- 16 fields
-- ============================================================================
CREATE TABLE educational_info (
    id SERIAL PRIMARY KEY,
    application_id INTEGER UNIQUE NOT NULL REFERENCES application(id) ON DELETE CASCADE,

    -- College Information
    college_name VARCHAR(255) NOT NULL,
    degree VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    year VARCHAR(50) NOT NULL,
    tamil_medium BOOLEAN NOT NULL DEFAULT FALSE,

    -- Schooling History (6th to 8th)
    six_to_8_govt_school BOOLEAN NOT NULL DEFAULT FALSE,
    six_to_8_school_name VARCHAR(255) NOT NULL,

    -- Schooling History (9th to 10th)
    nine_to_10_govt_school BOOLEAN NOT NULL DEFAULT FALSE,
    nine_to_10_school_name VARCHAR(255) NOT NULL,

    -- Schooling History (11th to 12th)
    eleven_to_12_govt_school BOOLEAN NOT NULL DEFAULT FALSE,
    eleven_to_12_school_name VARCHAR(255) NOT NULL,

    -- Additional Information
    present_work VARCHAR(255),
    received_scholarship BOOLEAN NOT NULL DEFAULT FALSE,
    scholarship_details TEXT,
    transport_mode VARCHAR(50) NOT NULL,
    vglug_applied_before VARCHAR(50) NOT NULL
);

-- Indexes for educational_info table
CREATE INDEX idx_edu_application_id ON educational_info(application_id);
CREATE INDEX idx_edu_college_name ON educational_info(college_name);
CREATE INDEX idx_edu_degree ON educational_info(degree);
CREATE INDEX idx_edu_department ON educational_info(department);
CREATE INDEX idx_edu_year ON educational_info(year);
CREATE INDEX idx_edu_tamil_medium ON educational_info(tamil_medium);
CREATE INDEX idx_edu_received_scholarship ON educational_info(received_scholarship);
CREATE INDEX idx_edu_transport_mode ON educational_info(transport_mode);
CREATE INDEX idx_edu_vglug_applied_before ON educational_info(vglug_applied_before);
CREATE INDEX idx_college_dept ON educational_info(college_name, department);
CREATE INDEX idx_degree_year ON educational_info(degree, year);
CREATE INDEX idx_scholarship_transport ON educational_info(received_scholarship, transport_mode);

-- ============================================================================
-- TABLE: family_info
-- Family Information / குடும்ப தகவல்
-- 7 fields
-- ============================================================================
CREATE TABLE family_info (
    id SERIAL PRIMARY KEY,
    application_id INTEGER UNIQUE NOT NULL REFERENCES application(id) ON DELETE CASCADE,

    -- Family Structure
    family_environment VARCHAR(100) NOT NULL,
    single_parent_info VARCHAR(100),

    -- Family Members
    family_members_count INTEGER NOT NULL,
    family_members_details TEXT NOT NULL,

    -- Earning Members
    earning_members_count INTEGER NOT NULL,
    earning_members_details TEXT NOT NULL,

    -- Guardian Information
    guardian_details TEXT
);

-- Indexes for family_info table
CREATE INDEX idx_family_application_id ON family_info(application_id);
CREATE INDEX idx_family_environment ON family_info(family_environment);
CREATE INDEX idx_single_parent_info ON family_info(single_parent_info);
CREATE INDEX idx_family_members_count ON family_info(family_members_count);
CREATE INDEX idx_earning_members_count ON family_info(earning_members_count);
CREATE INDEX idx_family_env_single ON family_info(family_environment, single_parent_info);
CREATE INDEX idx_members_earning ON family_info(family_members_count, earning_members_count);

-- ============================================================================
-- TABLE: income_info
-- Income & Housing Information / வருமானம் மற்றும் வீடு தகவல்
-- 5 fields
-- ============================================================================
CREATE TABLE income_info (
    id SERIAL PRIMARY KEY,
    application_id INTEGER UNIQUE NOT NULL REFERENCES application(id) ON DELETE CASCADE,

    -- Land & Housing
    own_land_size VARCHAR(100),
    house_ownership VARCHAR(100) NOT NULL,

    -- Location
    full_address TEXT NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    district VARCHAR(100) NOT NULL
);

-- Indexes for income_info table
CREATE INDEX idx_income_application_id ON income_info(application_id);
CREATE INDEX idx_house_ownership ON income_info(house_ownership);
CREATE INDEX idx_pincode ON income_info(pincode);
CREATE INDEX idx_district ON income_info(district);
CREATE INDEX idx_district_pincode ON income_info(district, pincode);

-- ============================================================================
-- TABLE: course_info
-- Course Preference / பயிற்சி விருப்பம்
-- 4 fields
-- ============================================================================
CREATE TABLE course_info (
    id SERIAL PRIMARY KEY,
    application_id INTEGER UNIQUE NOT NULL REFERENCES application(id) ON DELETE CASCADE,

    -- Course Selection
    preferred_course VARCHAR(100) NOT NULL,
    training_benefit TEXT NOT NULL,

    -- VGLUG Awareness
    heard_about_vglug BOOLEAN NOT NULL DEFAULT FALSE,
    participated_in_vglug_events BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for course_info table
CREATE INDEX idx_course_application_id ON course_info(application_id);
CREATE INDEX idx_preferred_course ON course_info(preferred_course);
CREATE INDEX idx_heard_about_vglug ON course_info(heard_about_vglug);
CREATE INDEX idx_participated_in_vglug_events ON course_info(participated_in_vglug_events);
CREATE INDEX idx_course_heard ON course_info(preferred_course, heard_about_vglug);
CREATE INDEX idx_course_participated ON course_info(preferred_course, participated_in_vglug_events);

-- ============================================================================
-- USEFUL QUERIES
-- ============================================================================

-- Get complete application with all details
/*
SELECT
    a.*,
    b.*,
    e.*,
    f.*,
    i.*,
    c.*
FROM application a
LEFT JOIN basic_info b ON a.id = b.application_id
LEFT JOIN educational_info e ON a.id = e.application_id
LEFT JOIN family_info f ON a.id = f.application_id
LEFT JOIN income_info i ON a.id = i.application_id
LEFT JOIN course_info c ON a.id = c.application_id
WHERE a.uuid = 'your-uuid-here';
*/

-- Count applications by preferred course
/*
SELECT
    c.preferred_course,
    COUNT(*) as count
FROM application a
JOIN course_info c ON a.id = c.application_id
GROUP BY c.preferred_course
ORDER BY count DESC;
*/

-- Find applications by district
/*
SELECT
    a.application_number,
    b.full_name,
    b.email,
    i.district,
    c.preferred_course
FROM application a
JOIN basic_info b ON a.id = b.application_id
JOIN income_info i ON a.id = i.application_id
JOIN course_info c ON a.id = c.application_id
WHERE i.district = 'Villupuram'
ORDER BY a.created_at DESC;
*/

-- Find differently abled applicants
/*
SELECT
    a.application_number,
    b.full_name,
    b.email,
    b.contact,
    c.preferred_course
FROM application a
JOIN basic_info b ON a.id = b.application_id
JOIN course_info c ON a.id = c.application_id
WHERE b.differently_abled = TRUE
ORDER BY a.created_at DESC;
*/

-- Find scholarship recipients
/*
SELECT
    a.application_number,
    b.full_name,
    e.scholarship_details,
    e.college_name,
    e.department
FROM application a
JOIN basic_info b ON a.id = b.application_id
JOIN educational_info e ON a.id = e.application_id
WHERE e.received_scholarship = TRUE
ORDER BY a.created_at DESC;
*/

-- Single parent applicants
/*
SELECT
    a.application_number,
    b.full_name,
    f.family_environment,
    f.single_parent_info,
    f.earning_members_count
FROM application a
JOIN basic_info b ON a.id = b.application_id
JOIN family_info f ON a.id = f.application_id
WHERE f.single_parent_info IS NOT NULL
ORDER BY a.created_at DESC;
*/

-- Statistics by college
/*
SELECT
    e.college_name,
    COUNT(*) as total_applications,
    COUNT(CASE WHEN b.differently_abled = TRUE THEN 1 END) as differently_abled_count,
    COUNT(CASE WHEN e.received_scholarship = TRUE THEN 1 END) as scholarship_count,
    COUNT(CASE WHEN e.tamil_medium = TRUE THEN 1 END) as tamil_medium_count
FROM application a
JOIN basic_info b ON a.id = b.application_id
JOIN educational_info e ON a.id = e.application_id
GROUP BY e.college_name
ORDER BY total_applications DESC;
*/
