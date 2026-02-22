-- Change candidate_id columns in related tables to VARCHAR and update foreign key constraints
-- This makes candidate_id a VARCHAR foreign key referencing application.candidate_id

-- Drop existing foreign key constraints and change column types

-- BasicInfo
ALTER TABLE basic_info DROP CONSTRAINT IF EXISTS basic_info_candidate_id_fkey;
ALTER TABLE basic_info DROP CONSTRAINT IF EXISTS basic_info_application_id_fkey;
ALTER TABLE basic_info ALTER COLUMN candidate_id TYPE VARCHAR(20);
ALTER TABLE basic_info ADD CONSTRAINT basic_info_candidate_id_fkey
    FOREIGN KEY (candidate_id) REFERENCES application(candidate_id) ON DELETE CASCADE;

-- EducationalInfo
ALTER TABLE educational_info DROP CONSTRAINT IF EXISTS educational_info_candidate_id_fkey;
ALTER TABLE educational_info DROP CONSTRAINT IF EXISTS educational_info_application_id_fkey;
ALTER TABLE educational_info ALTER COLUMN candidate_id TYPE VARCHAR(20);
ALTER TABLE educational_info ADD CONSTRAINT educational_info_candidate_id_fkey
    FOREIGN KEY (candidate_id) REFERENCES application(candidate_id) ON DELETE CASCADE;

-- FamilyInfo
ALTER TABLE family_info DROP CONSTRAINT IF EXISTS family_info_candidate_id_fkey;
ALTER TABLE family_info DROP CONSTRAINT IF EXISTS family_info_application_id_fkey;
ALTER TABLE family_info ALTER COLUMN candidate_id TYPE VARCHAR(20);
ALTER TABLE family_info ADD CONSTRAINT family_info_candidate_id_fkey
    FOREIGN KEY (candidate_id) REFERENCES application(candidate_id) ON DELETE CASCADE;

-- IncomeInfo
ALTER TABLE income_info DROP CONSTRAINT IF EXISTS income_info_candidate_id_fkey;
ALTER TABLE income_info DROP CONSTRAINT IF EXISTS income_info_application_id_fkey;
ALTER TABLE income_info ALTER COLUMN candidate_id TYPE VARCHAR(20);
ALTER TABLE income_info ADD CONSTRAINT income_info_candidate_id_fkey
    FOREIGN KEY (candidate_id) REFERENCES application(candidate_id) ON DELETE CASCADE;

-- CourseInfo
ALTER TABLE course_info DROP CONSTRAINT IF EXISTS course_info_candidate_id_fkey;
ALTER TABLE course_info DROP CONSTRAINT IF EXISTS course_info_application_id_fkey;
ALTER TABLE course_info ALTER COLUMN candidate_id TYPE VARCHAR(20);
ALTER TABLE course_info ADD CONSTRAINT course_info_candidate_id_fkey
    FOREIGN KEY (candidate_id) REFERENCES application(candidate_id) ON DELETE CASCADE;
