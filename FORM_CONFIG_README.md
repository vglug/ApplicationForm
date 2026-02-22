# Form Configuration System

## Overview
The application now uses a database-backed form configuration system with versioning support. Form templates are stored in the `form_config` table instead of being read directly from JSON files.

## Database Schema

### FormConfig Table
```sql
CREATE TABLE form_config (
    id SERIAL PRIMARY KEY,
    template_json JSONB NOT NULL,
    year INTEGER NOT NULL,
    version INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, version)
);
```

**Fields:**
- `template_json`: The complete form configuration in JSON format
- `year`: The academic year for this form (e.g., 2025)
- `version`: Version number for this year (starts at 1, increments for each new version)
- `is_active`: Only one form per year can be active at a time
- `created_at`: When this version was created
- `updated_at`: When this version was last modified

## How It Works

### Backend (`/form` endpoint)
1. Queries the database for active form configuration: `FormConfig.query.filter_by(is_active=True).order_by(FormConfig.year.desc(), FormConfig.version.desc()).first()`
2. Returns the `template_json` if found
3. Falls back to reading from `markdown/dynamic_form_json.json` if no active form exists in database

### Frontend
1. On component mount, calls `api.getForm()` to fetch the form configuration
2. Displays a loading spinner while fetching
3. Renders the form using the fetched configuration
4. Shows error message if fetch fails

## Version Management

### Creating a New Version
When you need to update the form (e.g., add new fields, change validation):

1. **Use the seed script:**
   ```bash
   cd backend
   source .venv/bin/activate
   python seed_form.py
   ```

2. **The script will:**
   - Check if an active form exists for the year
   - Prompt you to create a new version
   - Deactivate the old version
   - Create and activate the new version

3. **Manual version creation:**
   ```python
   from app import create_app
   from models import db, FormConfig

   app = create_app()
   with app.app_context():
       # Deactivate all existing forms for 2025
       FormConfig.query.filter_by(year=2025, is_active=True).update({'is_active': False})

       # Create new version
       new_form = FormConfig(
           template_json=your_json_data,
           year=2025,
           version=2,  # Next version number
           is_active=True
       )
       db.session.add(new_form)
       db.session.commit()
   ```

### Viewing All Versions
```python
# Get all versions for a specific year
versions = FormConfig.query.filter_by(year=2025).order_by(FormConfig.version.desc()).all()

for v in versions:
    print(f"Version {v.version} - Active: {v.is_active} - Created: {v.created_at}")
```

### Rolling Back to a Previous Version
```python
from app import create_app
from models import db, FormConfig

app = create_app()
with app.app_context():
    # Deactivate current version
    FormConfig.query.filter_by(year=2025, is_active=True).update({'is_active': False})

    # Activate version 1
    old_version = FormConfig.query.filter_by(year=2025, version=1).first()
    old_version.is_active = True

    db.session.commit()
```

## Seed Script Usage

The `seed_form.py` script loads the form configuration from `markdown/dynamic_form_json.json` into the database.

```bash
cd backend
source .venv/bin/activate
python seed_form.py
```

**Features:**
- Automatically detects the year from the JSON title
- Checks for existing active forms
- Prompts before creating new versions
- Handles version incrementing
- Deactivates old versions when creating new ones

## JSON File Structure

The JSON file must have this structure:
```json
{
  "title": "VGLUG APPLICATION FORM 2025",
  "sections": {
    "section_key": {
      "label": "Section Label",
      "fields": [
        {
          "label": "Field Label",
          "actual_name": "field_name",
          "type": "text",
          "mandatory": true
        }
      ]
    }
  }
}
```

## Migration History

### Initial Setup
1. Created `FormConfig` model in [backend/models.py](backend/models.py)
2. Updated `/form` endpoint in [backend/app.py](backend/app.py) to query database
3. Modified [frontend/src/App.tsx](frontend/src/App.tsx) to fetch form from API
4. Created seed script [backend/seed_form.py](backend/seed_form.py)

## Benefits

1. **Version Control**: Keep track of all form changes over time
2. **Easy Rollback**: Revert to previous versions if needed
3. **No Deployment Required**: Update forms without redeploying code
4. **Audit Trail**: Track when forms were created and modified
5. **Year-based Organization**: Manage different forms for different academic years

## API Endpoints

### GET /form
Returns the active form configuration.

**Response:**
```json
{
  "title": "VGLUG APPLICATION FORM 2025",
  "sections": { ... }
}
```

**Status Codes:**
- `200`: Success
- `500`: Error loading form (falls back to file, returns error if file also fails)

## Future Enhancements

Possible improvements:
- Admin dashboard to manage form versions
- Form preview before activation
- Export/import form configurations
- Form analytics (which fields are most commonly left blank, etc.)
- Draft versions (not yet active)
- Scheduled activation of forms
