# Form Configuration Validation Rules

## Overview
This document describes the validation rules that must be followed when creating or editing form configurations in the VGLUG Admin Panel.

## Required Form Structure

### Top-Level Properties
- **title** (string, required): The title of the form
- **sections** (array, required): Array of section objects

### Required Sections
Every form configuration must include exactly these 4 sections:

1. **basic_info** - Personal Details
2. **educational_info** - Educational Details
3. **family_info** - Family Information
4. **income_info** - Income Information

## Section Structure

Each section must have:
- **key** (string, required): Unique identifier for the section
- **label** (string, required): Display name for the section
- **fields** (array, required): Array of field objects

## Field Structure

Each field must have:
- **actual_name** (string, required): Unique identifier for the field
- **label** (string, required): Display label for the field
- **type** (string, required): Field type (text, date, boolean, select, number, textarea)
- **mandatory** (boolean, required): Whether the field is required

Optional field properties:
- **options** (array): For select type fields
- **condition** (string): Conditional visibility expression

## Required Fields by Section

### basic_info
All fields from the seed form must be present:
- first_name
- last_name
- dob
- email
- contact
- contact_as_whatsapp
- watsapp_contact
- parent_contact
- differently_abled

### educational_info
All fields from the seed form must be present:
- 5_to_8_school
- 5_to_8_govt_school
- 9_to_10_school
- 9_to_10_govt_school
- 11_to_12_school
- 11_to_12_govt_school
- degree
- department
- year
- passed_out_year

### family_info
Mandatory fields:
- **raised_by_parents** (boolean): Whether the student is raised by parents
- **family_members_count** (number/text): Number of family members

### income_info
Mandatory fields:
- **own_house_or_rental** (text/select): Housing ownership status
- **house_type** (text/select): Type of house
- **family_income** (text/number): Family's income

## Valid Field Types

- **text**: Single-line text input
- **textarea**: Multi-line text input
- **date**: Date picker
- **boolean**: True/false checkbox
- **select**: Dropdown with predefined options (requires "options" array)
- **number**: Numeric input

## Example Valid Configuration

```json
{
  "title": "VGLUG APPLICATION FORM 2025",
  "sections": [
    {
      "key": "basic_info",
      "label": "Personal Details",
      "fields": [
        {
          "label": "First Name",
          "actual_name": "first_name",
          "type": "text",
          "mandatory": true
        },
        {
          "label": "Email",
          "actual_name": "email",
          "type": "text",
          "mandatory": true
        }
        // ... other required fields
      ]
    },
    {
      "key": "educational_info",
      "label": "Educational Details",
      "fields": [
        // ... required educational fields
      ]
    },
    {
      "key": "family_info",
      "label": "Family Information",
      "fields": [
        {
          "label": "Raised by Parents?",
          "actual_name": "raised_by_parents",
          "type": "boolean",
          "mandatory": true
        },
        {
          "label": "Family Members Count",
          "actual_name": "family_members_count",
          "type": "number",
          "mandatory": true
        }
      ]
    },
    {
      "key": "income_info",
      "label": "Income Information",
      "fields": [
        {
          "label": "Own House or Rental?",
          "actual_name": "own_house_or_rental",
          "type": "select",
          "mandatory": true,
          "options": ["Own House", "Rental"]
        },
        {
          "label": "House Type",
          "actual_name": "house_type",
          "type": "text",
          "mandatory": true
        },
        {
          "label": "Family Income",
          "actual_name": "family_income",
          "type": "number",
          "mandatory": true
        }
      ]
    }
  ]
}
```

## Validation Process

When you click "Save as New Version", the system will:

1. Parse your JSON to ensure it's valid
2. Check all required sections are present
3. Verify all required fields exist in each section
4. Validate field structure (actual_name, label, type, mandatory)
5. Check field types are valid
6. Verify select fields have options array

If validation fails, a modal will display specific errors that need to be fixed.

## Tips for Creating Valid Configurations

1. **Start with existing configuration**: Copy an existing valid configuration and modify it
2. **Check JSON syntax**: Ensure proper brackets, commas, and quotes
3. **Use Validation Rules button**: Click "View Validation Rules" to see the schema
4. **Test incrementally**: Make small changes and save frequently
5. **Keep required fields**: Don't remove mandatory fields from basic_info and educational_info

## Common Validation Errors

### Missing Section
```
Missing required section: "family_info"
```
**Fix**: Add the missing section to the sections array

### Missing Field
```
Section "basic_info" is missing required field: "first_name"
```
**Fix**: Add the required field to the section's fields array

### Invalid Field Type
```
Field "age" has invalid type: "integer"
```
**Fix**: Use "number" instead of "integer"

### Missing Options for Select
```
Field "status" with type "select" must have an "options" array
```
**Fix**: Add an options array: `"options": ["Option 1", "Option 2"]`

### Missing Mandatory Property
```
Field "email" must have a "mandatory" property
```
**Fix**: Add `"mandatory": true` or `"mandatory": false`

## Support

If you encounter validation errors you don't understand:
1. Check this documentation
2. Click "View Validation Rules" in the admin panel
3. Review the specific error messages in the validation modal
4. Compare your JSON with the example configuration above
