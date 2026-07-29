CREATE TABLE IF NOT EXISTS couples (
  id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY NOT NULL,
  couple_id TEXT NOT NULL,
  label TEXT NOT NULL,
  push_subscription_json TEXT,
  slot INTEGER NOT NULL,
  recovery_code TEXT NOT NULL,
  capacity_level INTEGER,
  capacity_updated_at INTEGER,
  FOREIGN KEY (couple_id) REFERENCES couples(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  partner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  FOREIGN KEY (partner_id) REFERENCES partners(id)
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY NOT NULL,
  couple_id TEXT NOT NULL,
  from_partner_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('choice', 'scale')),
  text TEXT NOT NULL,
  options_json TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (couple_id) REFERENCES couples(id),
  FOREIGN KEY (from_partner_id) REFERENCES partners(id)
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY NOT NULL,
  question_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id),
  FOREIGN KEY (partner_id) REFERENCES partners(id)
);

CREATE TABLE IF NOT EXISTS updates (
  id TEXT PRIMARY KEY NOT NULL,
  couple_id TEXT NOT NULL,
  from_partner_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (couple_id) REFERENCES couples(id),
  FOREIGN KEY (from_partner_id) REFERENCES partners(id)
);

CREATE TABLE IF NOT EXISTS update_responses (
  id TEXT PRIMARY KEY NOT NULL,
  update_id TEXT NOT NULL UNIQUE,
  partner_id TEXT NOT NULL,
  gif_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (update_id) REFERENCES updates(id),
  FOREIGN KEY (partner_id) REFERENCES partners(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_recovery_code ON partners(recovery_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_couple_slot ON partners(couple_id, slot);
CREATE INDEX IF NOT EXISTS idx_sessions_partner ON sessions(partner_id);
CREATE INDEX IF NOT EXISTS idx_questions_couple ON questions(couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_updates_couple ON updates(couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_update_responses_update ON update_responses(update_id);
