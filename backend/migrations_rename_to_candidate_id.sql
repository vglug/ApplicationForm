-- Migration: Rename application_number to candidate_id

-- Rename column in application table
ALTER TABLE application RENAME COLUMN application_number TO candidate_id;

-- Drop old index
DROP INDEX IF EXISTS idx_app_number_status;

-- Create new index
CREATE INDEX idx_candidate_id_status ON application(candidate_id, status);

-- Rename column in submission table (legacy)
ALTER TABLE submission RENAME COLUMN application_number TO candidate_id;

-- Update data format from APP to CID (optional, comment out if you want to keep existing data as is)
-- UPDATE application SET candidate_id = REPLACE(candidate_id, 'APP', 'CID');
-- UPDATE submission SET candidate_id = REPLACE(candidate_id, 'APP', 'CID');
