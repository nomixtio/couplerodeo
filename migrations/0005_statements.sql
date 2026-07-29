CREATE TABLE IF NOT EXISTS statements (
  id TEXT PRIMARY KEY NOT NULL,
  couple_id TEXT NOT NULL,
  from_partner_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (couple_id) REFERENCES couples(id),
  FOREIGN KEY (from_partner_id) REFERENCES partners(id)
);

CREATE TABLE IF NOT EXISTS statement_responses (
  id TEXT PRIMARY KEY NOT NULL,
  statement_id TEXT NOT NULL UNIQUE,
  partner_id TEXT NOT NULL,
  gif_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (statement_id) REFERENCES statements(id),
  FOREIGN KEY (partner_id) REFERENCES partners(id)
);

CREATE INDEX IF NOT EXISTS idx_statements_couple ON statements(couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_statement_responses_statement ON statement_responses(statement_id);
