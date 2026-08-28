import {
  normalizeQuickUpdatesSource,
  parseQuickUpdateItems,
  resolveQuickUpdatesPayload,
  serializeQuickUpdateItems,
  type QuickUpdateItem,
  type QuickUpdatesPayload,
  type QuickUpdatesSource,
} from "../shared/updates";
import type { Partner } from "./db";

export function quickUpdatesPayload(
  me: Partner,
  other: Partner | null,
): QuickUpdatesPayload {
  return resolveQuickUpdatesPayload(
    me.quick_updates_json,
    other?.quick_updates_json,
    me.quick_updates_source,
    other != null,
  );
}

export function parseQuickUpdatesPutBody(
  body: unknown,
): { ok: true; items: QuickUpdateItem[] } | { ok: false; error: string } {
  if (typeof body !== "object" || body == null) {
    return { ok: false, error: "Invalid body" };
  }
  return parseQuickUpdateItems((body as { items?: unknown }).items);
}

export function parseQuickUpdatesSourceBody(
  body: unknown,
): { ok: true; source: QuickUpdatesSource } | { ok: false; error: string } {
  if (typeof body !== "object" || body == null) {
    return { ok: false, error: "Invalid body" };
  }
  const raw = (body as { source?: unknown }).source;
  if (raw !== "mine" && raw !== "partner") {
    return { ok: false, error: "Source must be mine or partner" };
  }
  return { ok: true, source: normalizeQuickUpdatesSource(raw) };
}

export { serializeQuickUpdateItems };
