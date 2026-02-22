-- VGLUG Application Form 2025 Seed Data
-- This file seeds the database with the VGLUG form configuration for 2025

-- First, ensure the admin user exists
-- Password: WeGlug@123 (hashed with bcrypt)
INSERT INTO users (email, password_hash, is_admin, created_at)
VALUES (
  'vglugadmin',
  '$2b$12$LQv3c1yYdT8eZPjQ8rXVxOGnBzCZN5mJHYJRQBYZdZ6tJGvXqKqJO',
  true,
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Insert the VGLUG form configuration for 2025
INSERT INTO form_configs (year, version, title, config_json, is_active, created_at)
VALUES (
  2025,
  1,
  'VGLUG APPLICATION FORM 2025',
  '{
    "title": "VGLUG APPLICATION FORM 2025",
    "sections": [
      {
        "key": "basic_info",
        "label": "Personal Details / தனிப்பட்ட விவரங்கள்",
        "fields": [
          {
            "label": "Full Name / முழு பெயர்",
            "actual_name": "full_name",
            "type": "text",
            "mandatory": true
          },
          {
            "label": "Date of Birth / பிறந்ததேதி",
            "actual_name": "dob",
            "type": "date",
            "mandatory": true
          },
          {
            "label": "Gender / பாலினம்",
            "actual_name": "gender",
            "type": "select",
            "mandatory": true,
            "options": ["Male / ஆண்", "Female / பெண்", "Other / மற்றவை"]
          },
          {
            "label": "Email Address",
            "actual_name": "email",
            "type": "text",
            "mandatory": true
          },
          {
            "label": "Are you a differently abled person? / நீங்கள் மாற்றுத் திறனாளியா?",
            "actual_name": "differently_abled",
            "type": "boolean",
            "mandatory": true
          },
          {
            "label": "Contact Number / தொடர்பு எண்",
            "actual_name": "contact",
            "type": "text",
            "mandatory": true
          },
          {
            "label": "Is this the WhatsApp number?",
            "actual_name": "contact_as_whatsapp",
            "type": "boolean",
            "mandatory": true,
            "default": false
          },
          {
            "label": "WhatsApp Number / வாட்ஸ்அப் எண்",
            "actual_name": "whatsapp_contact",
            "type": "text",
            "mandatory": false,
            "condition": "contact_as_whatsapp == false"
          },
          {
            "label": "Do you have laptop or desktop computer? / உங்களிடம் மடிக்கணினி அல்லது கணினி உள்ளதா?",
            "actual_name": "has_laptop",
            "type": "boolean",
            "mandatory": true
          },
          {
            "label": "RAM memory (in numbers. Example: 4, 8)",
            "actual_name": "laptop_ram",
            "type": "number",
            "mandatory": false,
            "condition": "has_laptop == true"
          },
          {
            "label": "Processor",
            "actual_name": "laptop_processor",
            "type": "text",
            "mandatory": false,
            "condition": "has_laptop == true"
          }
        ]
      },
      {
        "key": "educational_info",
        "label": "Educational Details / கல்வி விவரங்கள்",
        "fields": [
          {
            "label": "College Name / கல்லூரியின் பெயர்",
            "actual_name": "college_name",
            "type": "text",
            "mandatory": true
          },
          {
            "label": "Degree / பட்டம்",
            "actual_name": "degree",
            "type": "text",
            "mandatory": true
          },
          {
            "label": "Department / துறை",
            "actual_name": "department",
            "type": "text",
            "mandatory": true
          },
          {
            "label": "Year of Studying / படிக்கும் ஆண்டு",
            "actual_name": "year",
            "type": "select",
            "mandatory": true,
            "options": ["1", "2", "3", "4", "Passed Out / முடித்தவர்"]
          },
          {
            "label": "Did you pursue/pursued your degree in Tamil medium? / பட்டப்படிப்பை தமிழ் வழியில் படித்தீர்களா/படிக்கிறீர்களா ஆம் எனில் குறிப்பிடவும்",
            "actual_name": "tamil_medium",
            "type": "boolean",
            "mandatory": true
          },
          {
            "label": "Did you attend government school from 6th to 8th standard? / தாங்கள் 6 முதல் 8 ஆம் வகுப்பு வரை அரசு பள்ளியில் பயின்றவரா?",
            "actual_name": "6_to_8_govt_school",
            "type": "boolean",
            "mandatory": true
          },
          {
            "label": "Name of the school where you studied from class 6th to 8th? / 6 முதல் 8 ஆம் வகுப்பு வரை படித்த பள்ளியின் பெயர்?",
            "actual_name": "6_to_8_school_name",
            "type": "text",
            "mandatory": true
          },
          {
            "label": "Have you studied 9th and 10th standard in government school? / தாங்கள் 9 மற்றும் 10 ஆம் வகுப்பு அரசு பள்ளியில் பயின்றவரா?",
            "actual_name": "9_to_10_govt_school",
            "type": "boolean",
            "mandatory": true
          },
          {
            "label": "Name of the school where you studied class 9th and 10th? / 9 மற்றும் 10 ஆம் வகுப்பு படித்த பள்ளியின் பெயர்?",
            "actual_name": "9_to_10_school_name",
            "type": "text",
            "mandatory": true
          },
          {
            "label": "Have you studied 11th and 12th standard in government school? / தாங்கள் 11 மற்றும் 12 ஆம் வகுப்பு அரசு பள்ளியில் பயின்றவரா?",
            "actual_name": "11_to_12_govt_school",
            "type": "boolean",
            "mandatory": true
          },
          {
            "label": "Name of the school where you studied class 11th and 12th? / 11 மற்றும் 12 ஆம் வகுப்பு படித்த பள்ளியின் பெயர்?",
            "actual_name": "11_to_12_school_name",
            "type": "text",
            "mandatory": true
          },
          {
            "label": "Did you finished your college education? If yes then please enter your present work / நீங்கள் கல்லூரி படிப்பை முடித்தவரா? ஆம் எனில் தங்களது தற்போது பணி குறித்து தெரிவிக்கவும்",
            "actual_name": "present_work",
            "type": "text",
            "mandatory": false,
            "condition": "year == \"Passed Out / முடித்தவர்\""
          },
          {
            "label": "Have you received government or non-government Scholarship? / நீங்கள் அரசு அல்லது அரசு சாரா உதவித்தொகை பெற்றுள்ளீர்களா?",
            "actual_name": "received_scholarship",
            "type": "boolean",
            "mandatory": true
          },
          {
            "label": "If yes, please mention the scholarship details. / ஆம் எனில், உதவித்தொகை விவரங்களைக் குறிப்பிடவும்",
            "actual_name": "scholarship_details",
            "type": "textarea",
            "mandatory": false,
            "condition": "received_scholarship == true"
          },
          {
            "label": "Mode of Transportation to reach your college? / தாங்கள் கல்லூரிக்குச் செல்வதற்கான போக்குவரத்து முறை?",
            "actual_name": "transport_mode",
            "type": "select",
            "mandatory": true,
            "options": ["Bus / பேருந்து", "Bike / இருசக்கர வாகனம்", "Cycle / மிதிவண்டி", "Walk / நடந்து", "Hostel / விடுதி"]
          },
          {
            "label": "இதற்கு முன்பு VGLUG பயிற்சிக்கு விண்ணப்பித்தவரா? ஆம் எனில் ஆண்டை தேர்வு செய்வோம்",
            "actual_name": "vglug_applied_before",
            "type": "select",
            "mandatory": true,
            "default": "Never Applied / முன்பு விண்ணப்பிக்கவில்லை",
            "options": ["2019", "2020", "2021", "2022", "2023", "2024", "Never Applied / முன்பு விண்ணப்பிக்கவில்லை"]
          }
        ]
      },
      {
        "key": "family_info",
        "label": "Family Information / குடும்ப தகவல்",
        "fields": [
          {
            "label": "Choose the family environment you belong to / தாங்கள் சார்ந்துள்ள குடும்ப சூழலை தேர்வு செய்க",
            "actual_name": "family_environment",
            "type": "select",
            "mandatory": true,
            "options": [
              "Raised by Both Parents / பெற்றோர் இருவரும் உயிருடன்",
              "Raised by Single Parent / ஒற்றை பெற்றோர்",
              "Raised by Guardian / பாதுகாவலர்"
            ]
          },
          {
            "label": "Fill out the following info / பின்வரும் தகவலை நிரப்பவும்",
            "actual_name": "single_parent_info",
            "type": "select",
            "mandatory": true,
            "condition": "family_environment == \"Raised by Single Parent / ஒற்றை பெற்றோர்\"",
            "options": [
              "Father no more / தந்தை இழந்தவர்",
              "Mother no more / தாய் இழந்தவர்"
            ]
          },
          {
            "label": "Family members count / குடும்ப உறுப்பினர்களின் எண்ணிக்கை",
            "actual_name": "family_members_count",
            "type": "number",
            "mandatory": true
          },
          {
            "label": "Family members details / குடும்ப உறுப்பினர்களின் விவரம்",
            "actual_name": "family_members_details",
            "type": "textarea",
            "mandatory": true
          },
          {
            "label": "Earning family members count / குடும்பத்தில் வருவாய் ஈட்டுவோரின் எண்ணிக்கை?",
            "actual_name": "earning_members_count",
            "type": "number",
            "mandatory": true
          },
          {
            "label": "Earning family member'\''s education and employment details (specify in detail) / வருவாய் ஈட்டும் குடும்ப உறுப்பினர்களின் கல்வி மற்றும் வேலை சார்ந்த விவரங்கள் (விரிவாக குறிப்பிடவும்)",
            "actual_name": "earning_members_details",
            "type": "textarea",
            "mandatory": true
          },
          {
            "label": "Guardian details (Ex: Uncle, Grand father) / பாதுகாவலர் விவரம் (எ.கா. அத்தை, மாமா, சித்தி சித்தப்பா)",
            "actual_name": "guardian_details",
            "type": "text",
            "mandatory": false,
            "condition": "family_environment == \"Raised by Guardian / பாதுகாவலர்\""
          }
        ]
      },
      {
        "key": "income_info",
        "label": "Income & Housing Information / வருமானம் மற்றும் வீடு தகவல்",
        "fields": [
          {
            "label": "Do you have your own land? If yes, write the size of the land / உங்களுக்கு சொந்த நிலம் உள்ளதா? ஆம் எனில், நிலத்தின் அளவை குறிப்பிடவும்",
            "actual_name": "own_land_size",
            "type": "text",
            "mandatory": false
          },
          {
            "label": "Do you have your own house? If yes, select the house type. / உங்களுக்கு சொந்த வீடு உள்ளதா? ஆம் எனில், வீட்டின் வகையை குறிப்பிடவும்",
            "actual_name": "house_ownership",
            "type": "select",
            "mandatory": true,
            "options": [
              "No House / வீடு இல்லை",
              "Rental / வாடகை",
              "Thatched / குடிசை",
              "Tiled Roof / ஓடு வீடு",
              "RCC/Concrete / கான்கிரீட் வீடு",
              "Apartment / அடுக்குமாடி"
            ]
          },
          {
            "label": "Full Address Detail / முழு முகவரி விவரம்",
            "actual_name": "full_address",
            "type": "textarea",
            "mandatory": true
          },
          {
            "label": "Pincode / அஞ்சல் குறியீடு",
            "actual_name": "pincode",
            "type": "text",
            "mandatory": true
          },
          {
            "label": "District Name / மாவட்டத்தின் பெயர்",
            "actual_name": "district",
            "type": "text",
            "mandatory": true
          }
        ]
      },
      {
        "key": "course_info",
        "label": "Course Preference / பயிற்சி விருப்பம்",
        "fields": [
          {
            "label": "Preferred course? (Select anyone) / கீழுக்காணும் எந்த பயிற்சியில் சேர விரும்புகிறீர்கள்? (ஏதேனும் ஒன்றை தேர்வுசெய்க)",
            "actual_name": "preferred_course",
            "type": "select",
            "mandatory": true,
            "options": [
              "Web Development / இணைய மேம்பாடு",
              "Mobile App Development / மொபைல் ஆப் மேம்பாடு",
              "Python Programming / பைத்தான் நிரலாக்கம்",
              "Data Science / தரவு அறிவியல்",
              "Linux System Administration / லினக்ஸ் கணினி நிர்வாகம்",
              "IoT (Internet of Things) / IoT",
              "Other / மற்றவை"
            ]
          },
          {
            "label": "How do you think this training will benefit you? / இந்த பயிற்சி எந்த விதத்தில் உங்களுக்கு பயன்தரும் என எண்ணுகிறீர்கள்?",
            "actual_name": "training_benefit",
            "type": "textarea",
            "mandatory": true
          },
          {
            "label": "Have you heard about VGLUG before? / VGLUG பற்றி இதற்கு முன்பு கேள்விப்பட்டுள்ளீர்களா?",
            "actual_name": "heard_about_vglug",
            "type": "boolean",
            "mandatory": true
          },
          {
            "label": "Have you participated in any events hosted by VGLUG? / VGLUG நடத்திய ஏதேனும் நிகழ்வுகளில் பங்கேற்றுள்ளீர்களா?",
            "actual_name": "participated_in_vglug_events",
            "type": "boolean",
            "mandatory": true
          }
        ]
      }
    ]
  }',
  true,
  NOW()
)
ON CONFLICT (year, version) DO UPDATE
SET
  config_json = EXCLUDED.config_json,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
