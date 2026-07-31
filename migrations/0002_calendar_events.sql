CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY NOT NULL,
  couple_id TEXT NOT NULL,
  from_partner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  event_date TEXT NOT NULL,
  notes TEXT,
  remind_at INTEGER,
  reminder_sent_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (couple_id) REFERENCES couples(id),
  FOREIGN KEY (from_partner_id) REFERENCES partners(id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_couple_date
  ON calendar_events(couple_id, event_date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_remind_due
  ON calendar_events(remind_at) WHERE reminder_sent_at IS NULL;
