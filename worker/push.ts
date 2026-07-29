import { buildPushHTTPRequest } from "@pushforge/builder";
import { APP_SLUG } from "../shared/app";
import type { Partner } from "./db";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface PushResult {
  sent: boolean;
  status?: number;
  error?: string;
}

function parsePrivateJWK(privateKeyJson: string): JsonWebKey {
  let raw = privateKeyJson.trim();
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    raw = raw.slice(1, -1);
  }
  return JSON.parse(raw) as JsonWebKey;
}

export async function sendPushToPartner(
  partner: Partner,
  privateKeyJson: string,
  payload: PushPayload,
  origin: string,
  adminContact = "mailto:couplerodeo@example.com",
): Promise<PushResult> {
  if (!partner.push_subscription_json) {
    return { sent: false, error: "No push subscription for partner" };
  }

  if (!privateKeyJson?.trim()) {
    return { sent: false, error: "VAPID_PRIVATE_KEY not configured" };
  }

  let subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  try {
    subscription = JSON.parse(partner.push_subscription_json);
  } catch {
    return { sent: false, error: "Invalid stored subscription JSON" };
  }

  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { sent: false, error: "Incomplete subscription (missing endpoint or keys)" };
  }

  const iconUrl = `${origin}/icons/icon-192.png`;

  try {
    const { endpoint, headers, body } = await buildPushHTTPRequest({
      privateJWK: parsePrivateJWK(privateKeyJson),
      subscription,
      message: {
        payload: {
          title: payload.title,
          body: payload.body,
          icon: iconUrl,
          badge: iconUrl,
          tag: payload.tag ?? `${APP_SLUG}-message`,
          renotify: true,
          data: { url: payload.url ?? "/questions?tab=answers" },
        },
        adminContact,
      },
    });

    const response = await fetch(endpoint, { method: "POST", headers, body });
    const sent = response.status === 201 || response.ok;

    if (!sent) {
      const detail = await response.text().catch(() => "");
      console.error("Push service rejected:", {
        partnerId: partner.id,
        status: response.status,
        detail: detail.slice(0, 200),
      });
      return {
        sent: false,
        status: response.status,
        error: `Push service returned ${response.status}`,
      };
    }

    console.log("Push sent:", { partnerId: partner.id, status: response.status });
    return { sent: true, status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown push error";
    console.error("Push failed:", { partnerId: partner.id, message });
    return { sent: false, error: message };
  }
}
