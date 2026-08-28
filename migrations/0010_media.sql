CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY NOT NULL,
  couple_id TEXT NOT NULL,
  from_partner_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('plan', 'update', 'other')),
  plan_id TEXT,
  update_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  cf_image_id TEXT,
  cf_stream_id TEXT,
  playback_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'processing', 'failed')),
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  deleted_by_partner_id TEXT,
  FOREIGN KEY (couple_id) REFERENCES couples(id),
  FOREIGN KEY (from_partner_id) REFERENCES partners(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (update_id) REFERENCES updates(id) ON DELETE SET NULL,
  FOREIGN KEY (deleted_by_partner_id) REFERENCES partners(id)
);

INSERT INTO media (
  id, couple_id, from_partner_id, source, plan_id, update_id, type,
  cf_image_id, cf_stream_id, playback_url, thumbnail_url, caption,
  sort_order, status, created_at, deleted_at, deleted_by_partner_id
)
SELECT
  id, couple_id, from_partner_id, 'plan', plan_id, NULL, type,
  cf_image_id, cf_stream_id, playback_url, thumbnail_url, caption,
  sort_order, status, created_at, NULL, NULL
FROM plan_media;

DROP TABLE plan_media;

CREATE INDEX IF NOT EXISTS idx_media_couple_created ON media(couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_plan ON media(plan_id, sort_order ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_media_couple_source ON media(couple_id, source, deleted_at);
