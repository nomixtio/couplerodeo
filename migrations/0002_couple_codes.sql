ALTER TABLE couples ADD COLUMN invite_code TEXT;
ALTER TABLE partners ADD COLUMN slot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE partners ADD COLUMN recovery_code TEXT;

-- Legacy sandbox rows all default to slot 0; remove them before unique indexes.
DELETE FROM answers WHERE question_id IN (
  SELECT q.id FROM questions q
  INNER JOIN couples c ON c.id = q.couple_id
  WHERE c.invite_code IS NULL
);
DELETE FROM questions WHERE couple_id IN (SELECT id FROM couples WHERE invite_code IS NULL);
DELETE FROM partners WHERE couple_id IN (SELECT id FROM couples WHERE invite_code IS NULL);
DELETE FROM couples WHERE invite_code IS NULL;

-- Assign unique slots for any remaining partners per couple.
UPDATE partners
SET slot = (
  SELECT COUNT(*) - 1
  FROM partners AS p2
  WHERE p2.couple_id = partners.couple_id
    AND p2.rowid <= partners.rowid
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  partner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  FOREIGN KEY (partner_id) REFERENCES partners(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_couples_invite_code ON couples(invite_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_recovery_code ON partners(recovery_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_couple_slot ON partners(couple_id, slot);
CREATE INDEX IF NOT EXISTS idx_sessions_partner ON sessions(partner_id);
