#!/usr/bin/env python3
"""
Migration script to create normalized tables for VGLUG Application Form

This script creates the new normalized tables:
- application
- basic_info
- educational_info
- family_info
- income_info
- course_info

Usage:
    cd backend
    python migrate_to_normalized.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db, Application, BasicInfo, EducationalInfo, FamilyInfo, IncomeInfo, CourseInfo

app = create_app()

def create_normalized_tables():
    """Create normalized tables"""
    print("=" * 60)
    print("Creating Normalized Database Tables")
    print("=" * 60)

    with app.app_context():
        # Create all tables
        db.create_all()

        print("\n✓ Successfully created the following tables:")
        print("  - application (main application record)")
        print("  - basic_info (personal details)")
        print("  - educational_info (education history)")
        print("  - family_info (family structure)")
        print("  - income_info (housing & location)")
        print("  - course_info (course preferences)")

        print("\n" + "=" * 60)
        print("Database Migration Completed!")
        print("=" * 60)

        print("\nIndexes created:")
        print("  - UUID and Application Number (for fast lookups)")
        print("  - Status and Created At (for filtering)")
        print("  - Name, Email, Contact (for searching)")
        print("  - College, Department, Degree (for analytics)")
        print("  - District, Pincode (for location-based queries)")
        print("  - Preferred Course (for course statistics)")
        print("  - And many more composite indexes...")

if __name__ == '__main__':
    create_normalized_tables()
