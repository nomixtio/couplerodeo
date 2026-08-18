ALTER TABLE notes ADD COLUMN deleted_at INTEGER;
ALTER TABLE notes ADD COLUMN deleted_by_partner_id TEXT REFERENCES partners(id);
CREATE INDEX IF NOT EXISTS idx_notes_couple_deleted ON notes(couple_id, deleted_at);
