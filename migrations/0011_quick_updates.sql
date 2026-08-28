ALTER TABLE partners ADD COLUMN quick_updates_json TEXT;
ALTER TABLE partners ADD COLUMN quick_updates_source TEXT NOT NULL DEFAULT 'mine';
