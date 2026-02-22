# Troubleshooting Guide

## Common Issues

### 1. Form Not Loading - "Cannot read properties of undefined (reading 'fields')"

**Error:**
```
DynamicForm.tsx:33 Uncaught TypeError: Cannot read properties of undefined (reading 'fields')
```

**Cause:**
The form configuration in the database uses an object format for sections, but the frontend expects an array format.

**Incorrect Format (Object):**
```json
{
  "title": "Form Title",
  "sections": {
    "section_key": {
      "label": "Section Label",
      "fields": [...]
    }
  }
}
```

**Correct Format (Array):**
```json
{
  "title": "Form Title",
  "sections": [
    {
      "key": "section_key",
      "label": "Section Label",
      "fields": [...]
    }
  ]
}
```

**Solution:**
1. Update `markdown/dynamic_form_json.json` to use array format
2. Re-run the seed script:
   ```bash
   cd backend
   source .venv/bin/activate
   python seed_form.py
   ```
3. Confirm creating a new version when prompted

---

### 2. Form Configuration Not Updating

**Symptom:**
Changes to the form JSON file don't appear in the application.

**Cause:**
The application now loads forms from the database, not directly from the JSON file.

**Solution:**
After modifying `dynamic_form_json.json`, run the seed script to create a new version:
```bash
cd backend
source .venv/bin/activate
python seed_form.py
```

---

### 3. Database Migration Issues

**Error:**
```
psycopg2.errors.NotNullViolation: column "uuid" of relation "submission" contains null values
```

**Solution:**
This was fixed in migration `d050596423f8`. If you encounter this:
1. Ensure you're on the latest migration
2. Check that the migration adds columns as nullable first, populates them, then makes them non-nullable

---

### 4. PDF Generation Fails

**Symptom:**
Form submits successfully but PDF doesn't download.

**Possible Causes:**
1. Logo file missing at `backend/assets/images/vglug.png`
2. Required Python packages not installed

**Solution:**
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

Ensure logo exists:
```bash
ls backend/assets/images/vglug.png
```

---

### 5. CORS Errors

**Error:**
```
Access to fetch at 'http://localhost:5000/form' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:**
Check that your frontend URL is in the CORS allowed origins list in `backend/app.py`:
```python
CORS(app, origins=[
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5001'
])
```

---

## Debugging Tips

### Check Active Form Configuration
```bash
cd backend
source .venv/bin/activate
python -c "
from app import create_app
from models import FormConfig

app = create_app()
with app.app_context():
    active = FormConfig.query.filter_by(is_active=True).first()
    if active:
        print(f'Version: {active.version}')
        print(f'Year: {active.year}')
        print(f'Title: {active.template_json.get(\"title\")}')
    else:
        print('No active form found')
"
```

### List All Form Versions
```python
from app import create_app
from models import FormConfig

app = create_app()
with app.app_context():
    forms = FormConfig.query.order_by(FormConfig.year.desc(), FormConfig.version.desc()).all()
    for f in forms:
        print(f"Year {f.year} v{f.version} - Active: {f.is_active}")
```

### Check Backend Logs
Start the backend in debug mode to see detailed logs:
```bash
cd backend
source .venv/bin/activate
FLASK_ENV=development flask run --debug
```

### Check Frontend Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for the `/form` request
5. Check the response to see what data is being returned

---

## Rollback Procedures

### Rollback to Previous Form Version
```python
from app import create_app
from models import db, FormConfig

app = create_app()
with app.app_context():
    # Deactivate current version
    FormConfig.query.filter_by(year=2025, is_active=True).update({'is_active': False})

    # Activate previous version
    prev_version = FormConfig.query.filter_by(year=2025, version=1).first()
    if prev_version:
        prev_version.is_active = True
        db.session.commit()
        print(f"Rolled back to version {prev_version.version}")
    else:
        print("Previous version not found")
```

### Reset Database (Development Only)
```bash
cd backend
source .venv/bin/activate

# Drop all tables
flask shell
>>> from models import db
>>> db.drop_all()
>>> db.create_all()
>>> exit()

# Re-run all migrations
flask db upgrade

# Seed initial data
python seed_form.py
```

---

## Environment Setup Issues

### Python Virtual Environment Not Found
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Database Connection Errors
Check your `.env` file in the backend directory:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
JWT_SECRET_KEY=your-secret-key-here
```

### Node Modules Missing
```bash
cd frontend
npm install
```

---

## Contact & Support

For issues not covered in this guide:
1. Check the main README files
2. Review the FORM_CONFIG_README.md for form configuration details
3. Check browser console and backend logs for detailed error messages
