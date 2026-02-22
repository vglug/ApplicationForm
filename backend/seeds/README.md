# VGLUG Application Form - Database Seeding

This directory contains seed data for initializing the VGLUG Application Form database.

## Overview

The seeding process creates:
1. **Default Admin User**
   - Email: `vglugadmin`
   - Password: `WeGlug@123`
   - Role: Administrator

2. **Initial Form Configuration**
   - Year: 2025
   - Version: 1
   - Status: Active
   - Based on: `complete_form_example.json`

## Seeding Methods

### Method 1: Python Script (Recommended)

Use the Python seeding script for a safe, idempotent database initialization:

```bash
cd backend
python seed_database.py
```

**Advantages:**
- Idempotent (safe to run multiple times)
- Loads form JSON from the source file
- Automatically creates tables if needed
- Provides detailed output
- Handles password hashing correctly
- Cross-platform compatible

**Output:**
```
============================================================
VGLUG Application Form - Database Seeding
============================================================

✓ Database tables verified/created

Seeding Admin User:
------------------------------------------------------------
✓ Created admin user: vglugadmin
  Password: WeGlug@123

Seeding Form Configuration:
------------------------------------------------------------
✓ Created form configuration:
  Year: 2025
  Version: 1
  Title: VGLUG APPLICATION FORM 2025
  Sections: 4
  Status: Active

============================================================
✓ Database seeding completed successfully!
============================================================

Admin Login Credentials:
  Email: vglugadmin
  Password: WeGlug@123

Access the admin panel at: http://localhost:5000/admin
```

### Method 2: SQL Script

For direct database seeding using PostgreSQL:

```bash
psql -U your_username -d training_data -f backend/seeds/seed_form_config.sql
```

**Note:** The SQL script contains a hardcoded password hash. For production, use Method 1 or update the password after seeding.

## Database Configuration

Ensure your database connection is properly configured in `.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/training_data
JWT_SECRET_KEY=your-secret-key-here
```

## Form Configuration Structure

The seed data includes a complete form with 4 required sections:

### 1. Basic Info (Personal Details)
- First Name, Last Name
- Date of Birth
- Email, Contact Numbers
- Differently Abled status
- Laptop availability and details

### 2. Educational Info
- Schooling history (5-8, 9-10, 11-12)
- Higher education details
- Scholarship information
- Transport mode
- Previous VGLUG applications

### 3. Family Info
- Family environment
- Family member count
- Guardian information

### 4. Income Info
- Housing status and type
- Family income
- Parent occupations
- Additional income sources

## Validation

The seeded form configuration is validated against the schema defined in:
- `frontend/src/utils/formValidation.ts`
- `FORM_VALIDATION_RULES.md`

All required fields and sections are included to pass validation.

## After Seeding

1. **Access Admin Panel**: Navigate to `http://localhost:5000/admin`
2. **Login**: Use the credentials above
3. **Verify**: Check that the form configuration appears in the admin dashboard
4. **Test**: Try creating a new version or activating/deactivating versions

## Troubleshooting

### "Admin user already exists"
This is normal if you've run the seed script before. The script is idempotent.

### "Form configuration already exists"
The script checks for existing configurations. Run it safely multiple times.

### Database connection errors
1. Verify PostgreSQL is running
2. Check your `.env` configuration
3. Ensure the database exists: `createdb training_data`

### Import errors
Make sure you're in the backend directory and your virtual environment is activated:
```bash
cd backend
source .venv/bin/activate  # or .venv/Scripts/activate on Windows
python seed_database.py
```

## Updating the Seed Data

To update the seed form configuration:

1. Edit `markdown/complete_form_example.json`
2. Run the seed script with a new version number
3. Or manually create a new version through the admin panel

## Security Notes

⚠️ **Important**:
- Change the default admin password in production
- Use strong passwords for all admin accounts
- Keep your JWT_SECRET_KEY secure
- Don't commit `.env` files with real credentials

## Additional Resources

- Form Validation Rules: `FORM_VALIDATION_RULES.md`
- Complete Form Example: `markdown/complete_form_example.json`
- Database Models: `backend/models.py`
