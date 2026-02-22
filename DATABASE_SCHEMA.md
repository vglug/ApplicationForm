# VGLUG Application Form - Normalized Database Schema

## Overview

This document describes the normalized database schema for the VGLUG Application Form 2025. The schema is designed for optimal performance, data integrity, and easy querying.

## Schema Design Principles

1. **Normalization**: Data is split into logical tables to avoid redundancy
2. **Referential Integrity**: Foreign key constraints ensure data consistency
3. **Indexing**: Strategic indexes for fast queries and reporting
4. **Cascading Deletes**: Deleting an application removes all related data
5. **Type Safety**: Proper data types for each field

## Database Structure

```
application (main record)
    ├── basic_info (1:1)
    ├── educational_info (1:1)
    ├── family_info (1:1)
    ├── income_info (1:1)
    └── course_info (1:1)
```

---

## Tables

### 1. `application` (Main Application Record)

The central table that holds the application metadata. **Anonymous application - no user authentication required.**

| Column | Type | Description | Indexed |
|--------|------|-------------|---------|
| `id` | INTEGER | Primary key | ✓ (PK) |
| `uuid` | VARCHAR(36) | Unique identifier for PDF/lookup | ✓ (UNIQUE) |
| `application_number` | VARCHAR(20) | Human-readable app number (APP20251216001) | ✓ (UNIQUE) |
| `form_config_id` | INTEGER | FK to form_config table | |
| `status` | VARCHAR(20) | submitted, reviewed, approved, rejected | ✓ |
| `created_at` | TIMESTAMP | Submission timestamp | ✓ |
| `updated_at` | TIMESTAMP | Last update timestamp | |

**Composite Indexes:**
- `(status, created_at)` - For filtering by status and date
- `(application_number, status)` - For lookup with status

---

### 2. `basic_info` (Personal Details)

Stores personal information from the basic_info section.

| Column | Type | Description | Indexed |
|--------|------|-------------|---------|
| `id` | INTEGER | Primary key | ✓ (PK) |
| `application_id` | INTEGER | FK to application (CASCADE DELETE) | ✓ (UNIQUE) |
| `full_name` | VARCHAR(255) | Full name | ✓ |
| `dob` | DATE | Date of birth | ✓ |
| `gender` | VARCHAR(50) | Male/Female/Other | ✓ |
| `email` | VARCHAR(255) | Email address | ✓ |
| `differently_abled` | BOOLEAN | Differently abled status | ✓ |
| `contact` | VARCHAR(20) | Contact number | ✓ |
| `contact_as_whatsapp` | BOOLEAN | Is contact number WhatsApp? | |
| `whatsapp_contact` | VARCHAR(20) | Separate WhatsApp number | |
| `has_laptop` | BOOLEAN | Owns laptop/desktop? | ✓ |
| `laptop_ram` | VARCHAR(50) | RAM memory (if has laptop) | |
| `laptop_processor` | VARCHAR(100) | Processor type (if has laptop) | |

**Composite Indexes:**
- `(full_name, email)` - For duplicate detection
- `(gender, differently_abled)` - For demographic analysis

---

### 3. `educational_info` (Education History)

Stores complete educational background.

| Column | Type | Description | Indexed |
|--------|------|-------------|---------|
| `id` | INTEGER | Primary key | ✓ (PK) |
| `application_id` | INTEGER | FK to application (CASCADE DELETE) | ✓ (UNIQUE) |
| `college_name` | VARCHAR(255) | College name | ✓ |
| `degree` | VARCHAR(100) | Degree (BE, BSc, etc.) | ✓ |
| `department` | VARCHAR(100) | Department (CSE, ECE, etc.) | ✓ |
| `year` | VARCHAR(50) | Year of study or "Passed Out" | ✓ |
| `tamil_medium` | BOOLEAN | Tamil medium education? | ✓ |
| `six_to_8_govt_school` | BOOLEAN | Govt school (6-8)? | |
| `six_to_8_school_name` | VARCHAR(255) | School name (6-8) | |
| `nine_to_10_govt_school` | BOOLEAN | Govt school (9-10)? | |
| `nine_to_10_school_name` | VARCHAR(255) | School name (9-10) | |
| `eleven_to_12_govt_school` | BOOLEAN | Govt school (11-12)? | |
| `eleven_to_12_school_name` | VARCHAR(255) | School name (11-12) | |
| `present_work` | VARCHAR(255) | Current work (if passed out) | |
| `received_scholarship` | BOOLEAN | Received scholarship? | ✓ |
| `scholarship_details` | TEXT | Scholarship details | |
| `transport_mode` | VARCHAR(50) | Bus/Bike/Cycle/Walk/Hostel | ✓ |
| `vglug_applied_before` | VARCHAR(50) | Previous application year | ✓ |

**Composite Indexes:**
- `(college_name, department)` - For college-wise reports
- `(degree, year)` - For academic year analysis
- `(received_scholarship, transport_mode)` - For socioeconomic analysis

---

### 4. `family_info` (Family Structure)

Stores family and guardian information.

| Column | Type | Description | Indexed |
|--------|------|-------------|---------|
| `id` | INTEGER | Primary key | ✓ (PK) |
| `application_id` | INTEGER | FK to application (CASCADE DELETE) | ✓ (UNIQUE) |
| `family_environment` | VARCHAR(100) | Both Parents/Single Parent/Guardian | ✓ |
| `single_parent_info` | VARCHAR(100) | Father/Mother no more (conditional) | ✓ |
| `family_members_count` | INTEGER | Total family members | ✓ |
| `family_members_details` | TEXT | Details of family members | |
| `earning_members_count` | INTEGER | Number of earning members | ✓ |
| `earning_members_details` | TEXT | Details of earning members | |
| `guardian_details` | TEXT | Guardian info (if applicable) | |

**Composite Indexes:**
- `(family_environment, single_parent_info)` - For family structure analysis
- `(family_members_count, earning_members_count)` - For economic dependency analysis

---

### 5. `income_info` (Housing & Location)

Stores housing status and geographical information.

| Column | Type | Description | Indexed |
|--------|------|-------------|---------|
| `id` | INTEGER | Primary key | ✓ (PK) |
| `application_id` | INTEGER | FK to application (CASCADE DELETE) | ✓ (UNIQUE) |
| `own_land_size` | VARCHAR(100) | Land ownership size | |
| `house_ownership` | VARCHAR(100) | Rental/Tiled/RCC/Apartment/etc. | ✓ |
| `full_address` | TEXT | Complete address | |
| `pincode` | VARCHAR(10) | Postal code | ✓ |
| `district` | VARCHAR(100) | District name | ✓ |

**Composite Indexes:**
- `(district, pincode)` - For location-based queries
- `(house_ownership)` - For housing status analysis

---

### 6. `course_info` (Course Preferences)

Stores training preferences and VGLUG awareness.

| Column | Type | Description | Indexed |
|--------|------|-------------|---------|
| `id` | INTEGER | Primary key | ✓ (PK) |
| `application_id` | INTEGER | FK to application (CASCADE DELETE) | ✓ (UNIQUE) |
| `preferred_course` | VARCHAR(100) | Web Dev/Python/Data Science/etc. | ✓ |
| `training_benefit` | TEXT | How training will benefit | |
| `heard_about_vglug` | BOOLEAN | Heard about VGLUG before? | ✓ |
| `participated_in_vglug_events` | BOOLEAN | Participated in events before? | ✓ |

**Composite Indexes:**
- `(preferred_course, heard_about_vglug)` - For course awareness analysis
- `(preferred_course, participated_in_vglug_events)` - For course engagement analysis

---

## Total Statistics

- **6 tables**: 1 main + 5 section tables
- **43 data fields**: Matching the form structure
- **35+ indexes**: Optimized for common queries
- **5 one-to-one relationships**: Clean normalized structure

---

## Migration & Setup

### 1. Create Tables

```bash
cd backend
python migrate_to_normalized.py
```

This will create all 6 tables with proper indexes.

### 2. Save Application Data

```python
from helpers import save_normalized_application

# Structured data from frontend
structured_data = {
    "basic_info": [...],
    "educational_info": [...],
    "family_info": [...],
    "income_info": [...],
    "course_info": [...]
}

application = save_normalized_application(
    structured_data=structured_data,
    application_number="APP20251216001",
    uuid="abc-123-def-456",
    form_config_id=1
)
```

### 3. Retrieve Application Data

```python
from helpers import get_application_with_details

data = get_application_with_details(application_id="abc-123-def-456")
# Returns complete application with all sections
```

---

## Common Queries

### Find Applications by Course

```sql
SELECT
    a.application_number,
    b.full_name,
    b.email,
    c.preferred_course
FROM application a
JOIN basic_info b ON a.id = b.application_id
JOIN course_info c ON a.id = c.application_id
WHERE c.preferred_course = 'Web Development'
ORDER BY a.created_at DESC;
```

### Count by District

```sql
SELECT
    i.district,
    COUNT(*) as count
FROM application a
JOIN income_info i ON a.id = i.application_id
GROUP BY i.district
ORDER BY count DESC;
```

### Differently Abled Applicants

```sql
SELECT
    a.application_number,
    b.full_name,
    b.contact,
    c.preferred_course
FROM application a
JOIN basic_info b ON a.id = b.application_id
JOIN course_info c ON a.id = c.application_id
WHERE b.differently_abled = TRUE;
```

### Single Parent Families

```sql
SELECT
    a.application_number,
    b.full_name,
    f.single_parent_info,
    f.earning_members_count
FROM application a
JOIN basic_info b ON a.id = b.application_id
JOIN family_info f ON a.id = f.application_id
WHERE f.single_parent_info IS NOT NULL;
```

### Scholarship Recipients

```sql
SELECT
    a.application_number,
    b.full_name,
    e.scholarship_details,
    e.college_name
FROM application a
JOIN basic_info b ON a.id = b.application_id
JOIN educational_info e ON a.id = e.application_id
WHERE e.received_scholarship = TRUE;
```

---

## Benefits of Normalized Schema

### 1. **Performance**
- Indexed fields enable fast searches
- Composite indexes optimize complex queries
- Smaller table sizes improve JOIN performance

### 2. **Data Integrity**
- Foreign key constraints prevent orphaned records
- NOT NULL constraints ensure required data
- CASCADE DELETE maintains referential integrity

### 3. **Scalability**
- Easy to add new fields to specific sections
- Can add new tables without affecting existing structure
- Optimized for millions of records

### 4. **Reporting**
- Easy to generate section-specific reports
- Simple JOINs for cross-section analysis
- Efficient aggregation queries

### 5. **Maintenance**
- Clear separation of concerns
- Easy to backup/restore specific sections
- Simple to add validation rules per table

---

## Index Strategy

### Single-Column Indexes
Used for frequent filters and lookups:
- Primary keys (automatic)
- Foreign keys (application_id)
- Search fields (name, email, contact)
- Filter fields (status, gender, district, course)
- Boolean flags (differently_abled, has_laptop, received_scholarship)

### Composite Indexes
Used for common query patterns:
- `(status, created_at)` - Admin dashboard filtering
- `(full_name, email)` - Duplicate detection
- `(college_name, department)` - College reports
- `(district, pincode)` - Location-based queries
- `(preferred_course, heard_about_vglug)` - Course analysis

---

## Backwards Compatibility

The legacy `submission` table is retained for backwards compatibility. New submissions should use the normalized tables via the `save_normalized_application()` helper function.

---

## Files

- **`models.py`** - SQLAlchemy models
- **`helpers.py`** - Helper functions for saving/retrieving data
- **`migrate_to_normalized.py`** - Migration script
- **`schema_normalized.sql`** - SQL schema documentation

---

## Next Steps

1. Run migration script to create tables
2. Update backend submit endpoint to use `save_normalized_application()`
3. Update admin dashboard to query normalized tables
4. Add reporting queries for analytics
5. Create data export functionality

---

## Date

Created: 2025-12-16
