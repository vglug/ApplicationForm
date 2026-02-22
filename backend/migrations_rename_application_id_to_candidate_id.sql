-- Migration: Rename application_id to candidate_id in all related tables

-- Note: We're keeping the FK relationship to application.id, but renaming the column for consistency

-- BasicInfo table
ALTER TABLE basic_info RENAME COLUMN application_id TO candidate_id;

-- EducationalInfo table
ALTER TABLE educational_info RENAME COLUMN application_id TO candidate_id;

-- FamilyInfo table
ALTER TABLE family_info RENAME COLUMN application_id TO candidate_id;

-- IncomeInfo table
ALTER TABLE income_info RENAME COLUMN application_id TO candidate_id;

-- CourseInfo table
ALTER TABLE course_info RENAME COLUMN application_id TO candidate_id;
