ALTER TABLE updates ADD COLUMN payload_json TEXT;
ALTER TABLE update_responses ADD COLUMN kind TEXT NOT NULL DEFAULT 'gif';
ALTER TABLE update_responses ADD COLUMN value TEXT;

DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS questions;
