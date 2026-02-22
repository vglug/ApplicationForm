#!/usr/bin/env python3
"""
Script to create the default admin user.
Usage: python seed_admin.py
"""
from app import create_app
from models import db, User

def seed_admin_user():
    """Create default admin user if it doesn't exist."""
    app = create_app()

    with app.app_context():
        # Check if admin user already exists
        admin_email = 'vglugadmin'
        existing_admin = User.query.filter_by(email=admin_email).first()

        if existing_admin:
            print(f"✓ Admin user '{admin_email}' already exists")
            print(f"  Created: {existing_admin.created_at}")
            print(f"  Is Admin: {existing_admin.is_admin}")

            # Update to admin if not already
            if not existing_admin.is_admin:
                existing_admin.is_admin = True
                db.session.commit()
                print(f"  Updated to admin status")
            return

        # Create new admin user
        admin_user = User(
            email=admin_email,
            is_admin=True
        )
        admin_user.set_password('WeGlug@123')

        db.session.add(admin_user)
        db.session.commit()

        print(f"✓ Successfully created admin user:")
        print(f"  Email: {admin_email}")
        print(f"  Password: WeGlug@123")
        print(f"  Is Admin: True")
        print(f"\n⚠️  IMPORTANT: Change the default password after first login!")

if __name__ == '__main__':
    seed_admin_user()
