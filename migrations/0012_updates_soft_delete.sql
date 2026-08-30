ALTER TABLE updates ADD COLUMN deleted_at INTEGER;
ALTER TABLE updates ADD COLUMN deleted_by_partner_id TEXT REFERENCES partners(id);
CREATE INDEX IF NOT EXISTS idx_updates_couple_deleted ON updates(couple_id, deleted_at, created_at DESC);
