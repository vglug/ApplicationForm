-- Revert foreign key column names from candidate_id back to application_id
-- This fixes the semantic confusion where:
-- - application.candidate_id is VARCHAR (stores "CID20251001")
-- - Foreign keys are INTEGER (store application.id values like 1, 2, 3)
-- Column names should reflect actual data, so we use application_id for FK to application.id

ALTER TABLE basic_info RENAME COLUMN candidate_id TO application_id;
ALTER TABLE educational_info RENAME COLUMN candidate_id TO application_id;
ALTER TABLE family_info RENAME COLUMN candidate_id TO application_id;
ALTER TABLE income_info RENAME COLUMN candidate_id TO application_id;
ALTER TABLE course_info RENAME COLUMN candidate_id TO application_id;
