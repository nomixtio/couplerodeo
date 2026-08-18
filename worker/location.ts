import { LOCATION_SHARE_RATE_LIMIT_MS } from "../shared/location";

export { parseLocationShareBody } from "../shared/location";

export async function isLocationShareRateLimited(
  db: D1Database,
  partnerId: string,
  now = Date.now(),
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT created_at FROM updates
       WHERE from_partner_id = ? AND kind = 'location'
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(partnerId)
    .first<{ created_at: number }>();

  if (row == null) return false;
  return now - row.created_at < LOCATION_SHARE_RATE_LIMIT_MS;
}
