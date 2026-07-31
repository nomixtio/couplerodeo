CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  couple_id TEXT NOT NULL,
  from_partner_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('simple', 'todo')),
  title TEXT,
  body TEXT,
  items_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (couple_id) REFERENCES couples(id),
  FOREIGN KEY (from_partner_id) REFERENCES partners(id)
);

CREATE INDEX IF NOT EXISTS idx_notes_couple ON notes(couple_id, updated_at DESC);
