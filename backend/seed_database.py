#!/usr/bin/env python3
"""
VGLUG Application Form - Database Seeding Script

This script seeds the database with:
1. Default admin user (vglugadmin / WeGlug@123)
2. Initial form configuration for 2025

Usage:
    python seed_database.py
"""

import json
import os
from app import app, db
from models import User, FormConfig

def load_form_json():
    """Load the form configuration from the complete_form_example.json"""
    json_path = os.path.join(
        os.path.dirname(__file__),
        '..',
        'markdown',
        'complete_form_example.json'
    )

    with open(json_path, 'r') as f:
        return json.load(f)

def seed_admin_user():
    """Create the default admin user if it doesn't exist"""
    admin_email = 'vglugadmin'
    admin_password = 'WeGlug@123'

    # Check if admin already exists
    existing_admin = User.query.filter_by(email=admin_email).first()

    if existing_admin:
        print(f"✓ Admin user '{admin_email}' already exists")
        return existing_admin

    # Create new admin user
    admin = User(
        email=admin_email,
        is_admin=True
    )
    admin.set_password(admin_password)

    db.session.add(admin)
    db.session.commit()

    print(f"✓ Created admin user: {admin_email}")
    print(f"  Password: {admin_password}")
    return admin

def seed_form_config():
    """Create the initial form configuration for 2025"""
    year = 2025
    version = 1

    # Check if this version already exists
    existing_config = FormConfig.query.filter_by(
        year=year,
        version=version
    ).first()

    if existing_config:
        print(f"✓ Form configuration (Year: {year}, Version: {version}) already exists")
        return existing_config

    # Load form JSON
    form_json = load_form_json()

    # Deactivate all existing forms for this year
    FormConfig.query.filter_by(year=year, is_active=True).update({'is_active': False})

    # Create new form configuration
    config = FormConfig(
        template_json=form_json,
        year=year,
        version=version,
        is_active=True
    )

    db.session.add(config)
    db.session.commit()

    print(f"✓ Created form configuration:")
    print(f"  Year: {year}")
    print(f"  Version: {version}")
    print(f"  Title: {form_json['title']}")
    print(f"  Sections: {len(form_json['sections'])}")
    print(f"  Status: Active")

    return config

def main():
    """Main seeding function"""
    print("=" * 60)
    print("VGLUG Application Form - Database Seeding")
    print("=" * 60)
    print()

    with app.app_context():
        # Create all tables if they don't exist
        db.create_all()
        print("✓ Database tables verified/created")
        print()

        # Seed admin user
        print("Seeding Admin User:")
        print("-" * 60)
        seed_admin_user()
        print()

        # Seed form configuration
        print("Seeding Form Configuration:")
        print("-" * 60)
        seed_form_config()
        print()

        print("=" * 60)
        print("✓ Database seeding completed successfully!")
        print("=" * 60)
        print()
        print("Admin Login Credentials:")
        print("  Email: vglugadmin")
        print("  Password: WeGlug@123")
        print()
        print("Access the admin panel at: http://localhost:5000/admin")
        print()

if __name__ == '__main__':
    main()
