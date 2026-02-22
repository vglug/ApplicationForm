# VGLUG Application Form 2025

## Overview

This document describes the complete VGLUG Application Form structure for 2025, mapped from the Google Forms data with bilingual support (English/Tamil).

## Form Structure

The form consists of **5 main sections** with a total of **43 fields**:

### 1. Personal Details / தனிப்பட்ட விவரங்கள் (basic_info)
**11 fields** - Collects basic personal information

| Field | Type | Mandatory | Conditional |
|-------|------|-----------|-------------|
| Full Name / முழு பெயர் | text | ✓ | |
| Date of Birth / பிறந்ததேதி | date | ✓ | |
| Gender / பாலினம் | select | ✓ | |
| Email Address | text | ✓ | |
| Differently Abled / மாற்றுத் திறனாளி | boolean | ✓ | |
| Contact Number / தொடர்பு எண் | text | ✓ | |
| Is WhatsApp number? | boolean | ✓ | default: false |
| WhatsApp Number / வாட்ஸ்அப் எண் | text | | Shows when contact ≠ WhatsApp |
| Has laptop/desktop? | boolean | ✓ | |
| RAM memory | number | | Shows when has laptop |
| Processor | text | | Shows when has laptop |

**Key Features:**
- WhatsApp number field displays by default
- Conditional laptop details (RAM, Processor) based on ownership
- Bilingual labels for better accessibility

---

### 2. Educational Details / கல்வி விவரங்கள் (educational_info)
**16 fields** - Comprehensive education history from 6th standard to college

| Field | Type | Mandatory | Conditional |
|-------|------|-----------|-------------|
| College Name / கல்லூரியின் பெயர் | text | ✓ | |
| Degree / பட்டம் | text | ✓ | |
| Department / துறை | text | ✓ | |
| Year of Studying / படிக்கும் ஆண்டு | select | ✓ | 1,2,3,4, Passed Out |
| Tamil Medium? | boolean | ✓ | |
| 6-8 Govt School? | boolean | ✓ | |
| 6-8 School Name | text | ✓ | |
| 9-10 Govt School? | boolean | ✓ | |
| 9-10 School Name | text | ✓ | |
| 11-12 Govt School? | boolean | ✓ | |
| 11-12 School Name | text | ✓ | |
| Present Work | text | | Shows for passed out students |
| Received Scholarship? | boolean | ✓ | |
| Scholarship Details | textarea | | Shows when scholarship received |
| Transport Mode | select | ✓ | Bus/Bike/Cycle/Walk/Hostel |
| VGLUG Applied Before? | select | ✓ | Years or "Never Applied" |

**Key Features:**
- Complete schooling history (6th to 12th)
- College education details
- Scholarship tracking
- Previous VGLUG application history

---

### 3. Family Information / குடும்ப தகவல் (family_info)
**7 fields** - Family structure and guardian details

| Field | Type | Mandatory | Conditional |
|-------|------|-----------|-------------|
| Family Environment | select | ✓ | Both Parents/Single/Guardian |
| Single Parent Info | select | ✓ | Shows for Single Parent (Father/Mother no more) |
| Family Members Count | number | ✓ | |
| Family Members Details | textarea | ✓ | |
| Earning Members Count | number | ✓ | |
| Earning Members Details | textarea | ✓ | |
| Guardian Details | text | | Shows for Guardian-raised |

**Key Features:**
- Captures different family structures
- **NEW:** Specific single parent information (Father/Mother no more)
- Detailed earning member information
- Conditional fields for single parent and guardian scenarios

---

### 4. Income & Housing Information / வருமானம் மற்றும் வீடு தகவல் (income_info)
**5 fields** - Housing and location details

| Field | Type | Mandatory | Conditional |
|-------|------|-----------|-------------|
| Own Land Size | text | | Optional |
| House Ownership Type | select | ✓ | No House/Rental/Thatched/Tiled/RCC/Apartment |
| Full Address | textarea | ✓ | |
| Pincode / அஞ்சல் குறியீடு | text | ✓ | |
| District / மாவட்டம் | text | ✓ | |

**Key Features:**
- Comprehensive housing status options
- Complete address collection
- Land ownership tracking

---

### 5. Course Preference / பயிற்சி விருப்பம் (course_info)
**4 fields** - Training preferences and VGLUG awareness

| Field | Type | Mandatory | Conditional |
|-------|------|-----------|-------------|
| Preferred Course | select | ✓ | 7 tech courses available |
| Training Benefit | textarea | ✓ | |
| Heard About VGLUG? | boolean | ✓ | |
| Participated in VGLUG Events? | boolean | ✓ | |

**Available Courses:**
1. Web Development / இணைய மேம்பாடு
2. Mobile App Development / மொபைல் ஆப் மேம்பாடு
3. Python Programming / பைத்தான் நிரலாக்கம்
4. Data Science / தரவு அறிவியல்
5. Linux System Administration / லினக்ஸ் கணினி நிர்வாகம்
6. IoT (Internet of Things)
7. Other / மற்றவை

---

## Implementation Files

### Core Form Configuration
- **`markdown/vglug_form_2025.json`** - Complete form structure in JSON format
- **`backend/seeds/seed_vglug_form_2025.sql`** - SQL seed file for direct database insertion
- **`backend/seed_vglug_form_2025.py`** - Python seeding script (recommended)

### Validation
- **`frontend/src/utils/vglugFormValidation.ts`** - TypeScript validation schema

---

## Installation & Seeding

### Method 1: Python Script (Recommended)

```bash
cd backend
python seed_vglug_form_2025.py
```

**Features:**
- Idempotent (safe to run multiple times)
- Prompts before updating existing data
- Detailed output and error handling
- Loads form from JSON file

### Method 2: SQL Script

```bash
psql -U your_username -d training_data -f backend/seeds/seed_vglug_form_2025.sql
```

---

## Validation Rules

### Required Sections
All 5 sections must be present and completed:
1. ✓ basic_info
2. ✓ educational_info
3. ✓ family_info
4. ✓ income_info
5. ✓ course_info

### Conditional Fields
Several fields appear based on user input:

**Personal Details:**
- WhatsApp Number → Shows when `contact_as_whatsapp == false`
- Laptop RAM → Shows when `has_laptop == true`
- Laptop Processor → Shows when `has_laptop == true`

**Educational Details:**
- Present Work → Shows when `year == "Passed Out / முடித்தவர்"`
- Scholarship Details → Shows when `received_scholarship == true`

**Family Information:**
- **Single Parent Info** → Shows when `family_environment == "Raised by Single Parent / ஒற்றை பெற்றோர்"` (Father/Mother no more)
- Guardian Details → Shows when `family_environment == "Raised by Guardian / பாதுகாவலர்"`

### Custom Validations

**WhatsApp Number:**
- Field is conditionally mandatory
- Must be filled when checkbox is unchecked
- Can be left empty if contact number IS WhatsApp number

---

## Field Mapping from Google Forms

| Google Form Column | Form Field | Section |
|-------------------|------------|---------|
| Full Name/முழு பெயர் | full_name | basic_info |
| Date of birth/பிறந்ததேதி | dob | basic_info |
| Gender/பாலினம் | gender | basic_info |
| Email Address | email | basic_info |
| Are you a differently abled person? | differently_abled | basic_info |
| Contact Number/தொடர்பு எண் | contact | basic_info |
| If whatsapp number is different... | whatsapp_contact | basic_info |
| Do you have laptop or desktop? | has_laptop | basic_info |
| RAM memory | laptop_ram | basic_info |
| Processor | laptop_processor | basic_info |
| College Name/கல்லூரியின் பெயர் | college_name | educational_info |
| Degree/பட்டம் | degree | educational_info |
| Department/துறை | department | educational_info |
| Year of Studying/படிக்கும் ஆண்டு | year | educational_info |
| Tamil medium? | tamil_medium | educational_info |
| 6th to 8th govt school? | 6_to_8_govt_school | educational_info |
| 6th to 8th school name? | 6_to_8_school_name | educational_info |
| 9th and 10th govt school? | 9_to_10_govt_school | educational_info |
| 9th and 10th school name? | 9_to_10_school_name | educational_info |
| 11th and 12th govt school? | 11_to_12_govt_school | educational_info |
| 11th and 12th school name? | 11_to_12_school_name | educational_info |
| College education finished? Present work? | present_work | educational_info |
| Received scholarship? | received_scholarship | educational_info |
| Scholarship details | scholarship_details | educational_info |
| Mode of Transportation | transport_mode | educational_info |
| VGLUG applied before? | vglug_applied_before | educational_info |
| Family environment | family_environment | family_info |
| Family members count | family_members_count | family_info |
| Family members details | family_members_details | family_info |
| Earning members count | earning_members_count | family_info |
| Earning members details | earning_members_details | family_info |
| Guardian details | guardian_details | family_info |
| Own land size | own_land_size | income_info |
| House ownership | house_ownership | income_info |
| Full Address | full_address | income_info |
| Pincode | pincode | income_info |
| District | district | income_info |
| Preferred course? | preferred_course | course_info |
| Training benefit? | training_benefit | course_info |
| Heard about VGLUG? | heard_about_vglug | course_info |
| Participated in VGLUG events? | participated_in_vglug_events | course_info |

---

## Key Differences from Previous Form

### New Sections
- **course_info** - Dedicated section for course preferences and VGLUG awareness

### Removed Fields
- Parent/Guardian Number (consolidated into family details)
- First Name/Last Name split (now single Full Name field)
- Specific parent occupation fields (now part of earning members details)

### Enhanced Fields
- **Gender selection** with Tamil labels
- **Tamil medium education** tracking
- **Complete schooling history** (6-8, 9-10, 11-12)
- **Guardian details** for non-traditional families
- **VGLUG participation tracking**

---

## Admin Panel Features

After seeding, administrators can:

1. **View Applications** - See all submitted applications
2. **Filter by Course** - Filter by preferred course
3. **Export Data** - Export applications for analysis
4. **Manage Versions** - Create new form versions
5. **Activate/Deactivate** - Control which form version is live

---

## Default Admin Credentials

**Email:** `vglugadmin`
**Password:** `WeGlug@123`

⚠️ **Security Note:** Change the default password immediately in production!

---

## Testing Checklist

### Form Display
- [ ] All 5 sections load correctly
- [ ] Bilingual labels display properly
- [ ] Section navigation works
- [ ] Progress indicator shows correct section

### Field Behavior
- [ ] WhatsApp field shows by default (checkbox unchecked)
- [ ] Laptop details show/hide based on ownership
- [ ] Present work shows only for passed out students
- [ ] Scholarship details show only when scholarship received
- [ ] Guardian details show only for guardian-raised students

### Validation
- [ ] Cannot proceed without required fields
- [ ] WhatsApp number required when checkbox unchecked
- [ ] Can skip WhatsApp field by checking box
- [ ] All conditional fields validate correctly
- [ ] Form summary shows all sections correctly

### Submission
- [ ] Form submits successfully
- [ ] Data saved correctly in database
- [ ] Confirmation message appears
- [ ] Draft saved every 30 seconds

---

## Support & Documentation

For questions or issues:
1. Check the [main README](README.md)
2. Review [FORM_VALIDATION_RULES.md](FORM_VALIDATION_RULES.md)
3. See [CHANGELOG.md](CHANGELOG.md) for recent changes

## Date
Created: 2025-12-16
