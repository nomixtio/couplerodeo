CREATE TABLE IF NOT EXISTS location_shares (
  id TEXT PRIMARY KEY NOT NULL,
  couple_id TEXT NOT NULL,
  from_partner_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy_m REAL,
  label TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (couple_id) REFERENCES couples(id),
  FOREIGN KEY (from_partner_id) REFERENCES partners(id)
);

CREATE INDEX IF NOT EXISTS idx_location_shares_couple
  ON location_shares(couple_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_shares_partner
  ON location_shares(from_partner_id, created_at DESC);
