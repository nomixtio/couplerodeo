CREATE TABLE IF NOT EXISTS couples (
  id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY NOT NULL,
  couple_id TEXT NOT NULL,
  label TEXT NOT NULL,
  push_subscription_json TEXT,
  FOREIGN KEY (couple_id) REFERENCES couples(id)
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY NOT NULL,
  couple_id TEXT NOT NULL,
  from_partner_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('choice', 'scale', 'gif')),
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

CREATE INDEX IF NOT EXISTS idx_questions_couple ON questions(couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
