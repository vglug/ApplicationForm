#!/usr/bin/env python3
"""
VGLUG Application Form 2025 - Database Seeding Script

This script seeds the database with:
1. Default admin user (if not exists)
2. VGLUG form configuration for 2025

Usage:
    cd backend
    python seed_vglug_form_2025.py
"""

import os
import sys
import json
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db, User, FormConfig

# Create the Flask app
app = create_app()

def load_form_json():
    """Load the form configuration from vglug_form_2025.json"""
    json_path = os.path.join(
        os.path.dirname(__file__),
        '..',
        'markdown',
        'vglug_form_2025.json'
    )

    if not os.path.exists(json_path):
        print(f"❌ Error: Form JSON file not found at {json_path}")
        sys.exit(1)

    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def seed_admin_user():
    """Create the default admin user if it doesn't exist"""
    print("\nSeeding Admin User:")
    print("-" * 60)

    admin_email = 'vglugadmin'
    admin_password = 'WeGlug@123'

    existing_admin = User.query.filter_by(email=admin_email).first()

    if existing_admin:
        print(f"✓ Admin user '{admin_email}' already exists")
        return existing_admin

    admin = User(email=admin_email, is_admin=True)
    admin.set_password(admin_password)

    db.session.add(admin)
    db.session.commit()

    print(f"✓ Created admin user: {admin_email}")
    print(f"  Password: {admin_password}")

    return admin

def seed_form_config():
    """Create the VGLUG form configuration for 2025"""
    print("\nSeeding Form Configuration:")
    print("-" * 60)

    form_data = load_form_json()
    year = 2025
    version = 1

    # Check if form config already exists
    existing_config = FormConfig.query.filter_by(year=year, version=version).first()

    if existing_config:
        print(f"⚠ Form configuration for year {year} version {version} already exists")
        update = input("Do you want to update it? (y/n): ").lower().strip()

        if update == 'y':
            existing_config.config_json = form_data
            existing_config.title = form_data['title']
            existing_config.is_active = True
            existing_config.updated_at = datetime.utcnow()
            db.session.commit()
            print(f"✓ Updated form configuration:")
        else:
            print("✓ Keeping existing form configuration:")
            form_data = existing_config.config_json
    else:
        form_config = FormConfig(
            year=year,
            version=version,
            title=form_data['title'],
            config_json=form_data,
            is_active=True
        )
        db.session.add(form_config)
        db.session.commit()
        print(f"✓ Created form configuration:")

    # Display summary
    print(f"  Year: {year}")
    print(f"  Version: {version}")
    print(f"  Title: {form_data['title']}")
    print(f"  Sections: {len(form_data['sections'])}")

    for section in form_data['sections']:
        print(f"    - {section['label']} ({len(section['fields'])} fields)")

    print(f"  Status: Active")

def main():
    """Main seeding function"""
    print("=" * 60)
    print("VGLUG Application Form 2025 - Database Seeding")
    print("=" * 60)

    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        print("✓ Database tables verified/created")

        # Seed admin user
        seed_admin_user()

        # Seed form configuration
        seed_form_config()

        print("\n" + "=" * 60)
        print("✓ Database seeding completed successfully!")
        print("=" * 60)

        print("\nAdmin Login Credentials:")
        print("  Email: vglugadmin")
        print("  Password: WeGlug@123")
        print("\nAccess the admin panel at: http://localhost:5000/admin")

if __name__ == '__main__':
    main()
