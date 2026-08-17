CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY NOT NULL,
  couple_id TEXT NOT NULL,
  from_partner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  cover_media_id TEXT,
  budget_amount_cents INTEGER,
  budget_currency TEXT NOT NULL DEFAULT 'EUR',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (couple_id) REFERENCES couples(id),
  FOREIGN KEY (from_partner_id) REFERENCES partners(id)
);

CREATE INDEX IF NOT EXISTS idx_plans_couple_updated ON plans(couple_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_plans_couple_start ON plans(couple_id, start_date);

CREATE TABLE IF NOT EXISTS plan_media (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL,
  couple_id TEXT NOT NULL,
  from_partner_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  cf_image_id TEXT,
  cf_stream_id TEXT,
  playback_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'processing', 'failed')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (couple_id) REFERENCES couples(id),
  FOREIGN KEY (from_partner_id) REFERENCES partners(id)
);

CREATE INDEX IF NOT EXISTS idx_plan_media_plan ON plan_media(plan_id, sort_order ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS plan_expenses (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL,
  couple_id TEXT NOT NULL,
  from_partner_id TEXT NOT NULL,
  paid_by_partner_id TEXT NOT NULL,
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  category TEXT,
  expense_date TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (couple_id) REFERENCES couples(id),
  FOREIGN KEY (from_partner_id) REFERENCES partners(id),
  FOREIGN KEY (paid_by_partner_id) REFERENCES partners(id)
);

CREATE INDEX IF NOT EXISTS idx_plan_expenses_plan ON plan_expenses(plan_id, created_at DESC);

ALTER TABLE notes ADD COLUMN plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notes_plan ON notes(plan_id, updated_at DESC);
