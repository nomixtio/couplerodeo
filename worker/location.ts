import { LOCATION_SHARE_RATE_LIMIT_MS } from "../shared/location";

export { parseLocationShareBody } from "../shared/location";

export interface LocationShareRow {
  id: string;
  couple_id: string;
  from_partner_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  label: string | null;
  created_at: number;
}

export interface LocationShareWithLabel extends LocationShareRow {
  from_label: string;
}

export async function getLatestLocationShareForPartner(
  db: D1Database,
  coupleId: string,
  partnerId: string,
): Promise<LocationShareWithLabel | null> {
  const row = await db
    .prepare(
      `SELECT ls.*, p.label as from_label
       FROM location_shares ls
       JOIN partners p ON p.id = ls.from_partner_id
       WHERE ls.couple_id = ? AND ls.from_partner_id = ?
       ORDER BY ls.created_at DESC
       LIMIT 1`,
    )
    .bind(coupleId, partnerId)
    .first<LocationShareRow & { from_label: string }>();

  return row ?? null;
}

export async function getLatestLocationShares(
  db: D1Database,
  coupleId: string,
): Promise<LocationShareWithLabel[]> {
  const { results: partners } = await db
    .prepare("SELECT id FROM partners WHERE couple_id = ?")
    .bind(coupleId)
    .all<{ id: string }>();

  if (!partners?.length) return [];

  const shares: LocationShareWithLabel[] = [];
  for (const partner of partners) {
    const share = await getLatestLocationShareForPartner(
      db,
      coupleId,
      partner.id,
    );
    if (share) shares.push(share);
  }

  return shares.sort((a, b) => b.created_at - a.created_at);
}

export async function getRecentLocationShareAt(
  db: D1Database,
  partnerId: string,
): Promise<number | null> {
  const row = await db
    .prepare(
      `SELECT created_at FROM location_shares
       WHERE from_partner_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(partnerId)
    .first<{ created_at: number }>();

  return row?.created_at ?? null;
}

export async function isLocationShareRateLimited(
  db: D1Database,
  partnerId: string,
  now = Date.now(),
): Promise<boolean> {
  const lastCreatedAt = await getRecentLocationShareAt(db, partnerId);
  if (lastCreatedAt == null) return false;
  return now - lastCreatedAt < LOCATION_SHARE_RATE_LIMIT_MS;
}

export async function createLocationShare(
  db: D1Database,
  data: {
    id: string;
    coupleId: string;
    fromPartnerId: string;
    latitude: number;
    longitude: number;
    accuracyM: number | null;
    label: string | null;
  },
): Promise<LocationShareWithLabel> {
  const now = Date.now();

  await db
    .prepare("DELETE FROM location_shares WHERE from_partner_id = ?")
    .bind(data.fromPartnerId)
    .run();

  await db
    .prepare(
      `INSERT INTO location_shares
       (id, couple_id, from_partner_id, latitude, longitude, accuracy_m, label, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.id,
      data.coupleId,
      data.fromPartnerId,
      data.latitude,
      data.longitude,
      data.accuracyM,
      data.label,
      now,
    )
    .run();

  const partner = await db
    .prepare("SELECT label FROM partners WHERE id = ?")
    .bind(data.fromPartnerId)
    .first<{ label: string }>();

  return {
    id: data.id,
    couple_id: data.coupleId,
    from_partner_id: data.fromPartnerId,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy_m: data.accuracyM,
    label: data.label,
    created_at: now,
    from_label: partner?.label ?? "Partner",
  };
}

export async function deleteLocationSharesForPartner(
  db: D1Database,
  partnerId: string,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM location_shares WHERE from_partner_id = ?")
    .bind(partnerId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function deleteLocationSharesForCouple(
  db: D1Database,
  coupleId: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM location_shares WHERE couple_id = ?")
    .bind(coupleId)
    .run();
}
