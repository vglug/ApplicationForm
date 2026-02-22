#!/usr/bin/env python3
"""
Script to seed the database with form configuration from JSON file.
Usage: python seed_form.py
"""
import os
import json
from app import create_app
from models import db, FormConfig

def seed_form_config():
    """Load form configuration from JSON file and save to database."""
    app = create_app()

    with app.app_context():
        # Load JSON file
        json_path = os.path.join(os.path.dirname(__file__), '..', 'markdown', 'dynamic_form_json.json')

        if not os.path.exists(json_path):
            print(f"Error: JSON file not found at {json_path}")
            return

        with open(json_path, 'r') as f:
            form_data = json.load(f)

        # Check if there's already an active form for 2025
        year = 2025
        existing_active = FormConfig.query.filter_by(year=year, is_active=True).first()

        if existing_active:
            print(f"Active form configuration already exists for year {year}")
            print(f"  Version: {existing_active.version}")
            print(f"  Created: {existing_active.created_at}")

            response = input("Do you want to create a new version? (y/n): ")
            if response.lower() != 'y':
                print("Aborted.")
                return

            # Get next version number
            latest_version = db.session.query(db.func.max(FormConfig.version)).filter_by(year=year).scalar() or 0
            new_version = latest_version + 1

            # Deactivate all existing forms for this year
            FormConfig.query.filter_by(year=year, is_active=True).update({'is_active': False})
        else:
            new_version = 1

        # Create new form configuration
        new_form = FormConfig(
            template_json=form_data,
            year=year,
            version=new_version,
            is_active=True
        )

        db.session.add(new_form)
        db.session.commit()

        print(f"✓ Successfully created form configuration:")
        print(f"  Year: {year}")
        print(f"  Version: {new_version}")
        print(f"  Active: True")
        print(f"  Form Title: {form_data.get('title', 'N/A')}")

if __name__ == '__main__':
    seed_form_config()
