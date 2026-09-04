import type { UnreadCounts } from "../shared/unread";
import { getUnreadCounts, type Partner } from "./db";
import { sendPushToPartner, type PushPayload, type PushResult } from "./push";

export async function sendPartnerPush(
  db: D1Database,
  recipient: Partner,
  coupleId: string,
  privateKeyJson: string,
  payload: PushPayload,
  origin: string,
): Promise<PushResult> {
  const counts: UnreadCounts = await getUnreadCounts(db, coupleId, recipient.id);
  return sendPushToPartner(
    recipient,
    privateKeyJson,
    { ...payload, unreadCount: counts.total },
    origin,
  );
}
