# Admin Panel Documentation

## Overview
The VGLUG Application Form now includes a comprehensive admin panel for managing form configurations and users.

## Access

### URL
```
http://localhost:5173/admin
```

### Default Credentials
- **Email:** `vglugadmin`
- **Password:** `WeGlug@123`

⚠️ **IMPORTANT:** Change the default password after first login by creating a new admin user and deleting the default one.

## Features

### 1. Form Configuration Management

#### View All Versions
- See all form configuration versions
- Each version shows:
  - Version number
  - Year
  - Active status
  - Creation date
  - Form title

#### Edit Form JSON
- Click on any version to view/edit its JSON configuration
- Full JSON editor with syntax highlighting
- Real-time validation

#### Create New Version
- Edit the JSON
- Click "Save as New Version"
- Automatically increments version number
- Automatically sets as active (deactivates previous version)

#### Activate Version
- Click "Activate" on any inactive version
- Makes it the live form visible to users
- Automatically deactivates other versions for that year

### 2. User Management

#### View All Users
- See all registered users
- View email, role, and creation date
- Admin users have a red "Admin" badge

#### Create New User
- Enter email and password
- Optionally grant admin privileges
- New users can immediately log in to admin panel (if admin) or use the regular form

## API Endpoints

### Authentication

#### POST /admin/login
Login to admin panel.

**Request:**
```json
{
  "email": "vglugadmin",
  "password": "WeGlug@123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "vglugadmin",
    "is_admin": true
  }
}
```

### Form Configuration Management

#### GET /admin/form-configs
Get all form configurations.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "year": 2025,
    "version": 4,
    "is_active": true,
    "created_at": "2025-12-15T20:12:40.857771",
    "title": "VGLUG APPLICATION FORM 2025"
  }
]
```

#### GET /admin/form-config/:id
Get detailed form configuration including full JSON.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 1,
  "year": 2025,
  "version": 4,
  "is_active": true,
  "created_at": "2025-12-15T20:12:40.857771",
  "updated_at": "2025-12-15T20:12:40.857771",
  "template_json": {
    "title": "VGLUG APPLICATION FORM 2025",
    "sections": [...]
  }
}
```

#### POST /admin/form-config
Create a new form configuration.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "template_json": {
    "title": "VGLUG APPLICATION FORM 2025",
    "sections": [...]
  },
  "year": 2025,
  "set_active": true
}
```

**Response:**
```json
{
  "msg": "Form configuration created",
  "id": 5,
  "year": 2025,
  "version": 5,
  "is_active": true
}
```

#### PUT /admin/form-config/:id/activate
Activate a specific form configuration.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "msg": "Form configuration activated"
}
```

### User Management

#### GET /admin/users
Get all users.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "email": "vglugadmin",
    "is_admin": true,
    "created_at": "2025-12-15T20:00:00.000000"
  }
]
```

#### POST /admin/users
Create a new user.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "email": "newadmin@example.com",
  "password": "SecurePassword123",
  "is_admin": true
}
```

**Response:**
```json
{
  "msg": "User created",
  "id": 2,
  "email": "newadmin@example.com",
  "is_admin": true
}
```

## Security Features

### JWT Authentication
- All admin endpoints require valid JWT token
- Tokens expire after configured time
- Tokens stored in localStorage for persistence

### Admin-Only Access
- All admin endpoints check `is_admin` flag
- Non-admin users receive 403 Forbidden
- Login endpoint specifically checks for admin privileges

### Password Hashing
- All passwords hashed using werkzeug security
- Original passwords never stored
- Secure password checking

## Common Tasks

### Creating a Default Admin User
```bash
cd backend
source .venv/bin/activate
python seed_admin.py
```

### Updating Form Configuration

1. Log in to admin panel
2. Click "Form Configurations" tab
3. Select the current active version
4. Edit the JSON in the editor
5. Click "Save as New Version"
6. New version becomes active automatically

### Rolling Back to Previous Version

1. Log in to admin panel
2. Click "Form Configurations" tab
3. Find the version you want to activate
4. Click "Activate" button
5. Confirm the activation

### Creating a New Admin User

1. Log in to admin panel with existing admin account
2. Click "User Management" tab
3. Fill in email and password
4. Check "Admin privileges" checkbox
5. Click "Create User"
6. New admin can immediately log in

### Changing Admin Password

Since there's no direct password change feature:

1. Create a new admin user with desired credentials
2. Log out and log in with new credentials
3. Optionally delete the old admin user (if you have another admin user)

## Troubleshooting

### Cannot Login
- Verify credentials (default: vglugadmin / WeGlug@123)
- Check backend is running on port 5000
- Check browser console for errors
- Verify user has `is_admin=true` in database

### JSON Validation Error
- Ensure JSON is valid (use a JSON validator)
- Check required fields: `title`, `sections`
- Ensure sections is an array, not an object
- Verify all field names match expected format

### Changes Not Reflecting
- Ensure you clicked "Save as New Version"
- Verify the new version is active (green badge)
- Clear browser cache
- Refresh the public form page

### Permission Denied (403)
- Verify JWT token is valid
- Check user has admin privileges
- Try logging out and back in
- Check token hasn't expired

## Database Schema Updates

### User Model
Added `is_admin` field:
```python
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)  # NEW
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

### Migration
```bash
cd backend
source .venv/bin/activate
flask db migrate -m "Add is_admin field to User model"
flask db upgrade
```

## File Structure

```
frontend/src/
├── AdminApp.tsx              # Main admin app component
├── pages/
│   ├── AdminLogin.tsx        # Admin login page
│   └── AdminDashboard.tsx    # Admin dashboard with tabs
└── services/
    └── adminApi.ts           # Admin API service

backend/
├── seed_admin.py             # Script to create default admin
└── app.py                    # Admin endpoints added
```

## Best Practices

1. **Always Test in Development First**
   - Test JSON changes locally before creating new version
   - Use JSON validators

2. **Keep Old Versions**
   - Don't delete old versions
   - They serve as backup and history

3. **Document Changes**
   - Add comments in version control when updating forms
   - Note what changed in each version

4. **Secure Credentials**
   - Change default password immediately
   - Use strong passwords for admin accounts
   - Don't share admin credentials

5. **Regular Backups**
   - Backup database regularly
   - Export form configurations periodically

## Future Enhancements

Possible improvements:
- Password change functionality
- User deletion
- Form configuration diff/comparison
- Form preview before activation
- Audit log for changes
- Export/import configurations
- Bulk operations
- Search and filter
