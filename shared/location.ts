export const LOCATION_LABEL_MAX_LENGTH = 80;
export const LOCATION_STALE_MS = 24 * 60 * 60 * 1000;
export const LOCATION_SHARE_RATE_LIMIT_MS = 30 * 1000;

export interface LocationShareInput {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  label: string | null;
}

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function normalizeLocationLabel(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > LOCATION_LABEL_MAX_LENGTH) return null;
  return trimmed;
}

export function normalizeAccuracyM(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 50_000) return null;
  return value;
}

export function parseLocationShareBody(body: {
  latitude?: unknown;
  longitude?: unknown;
  accuracyM?: unknown;
  label?: unknown;
}):
  | { ok: true; data: LocationShareInput }
  | { ok: false; error: string } {
  if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return { ok: false, error: "Latitude and longitude are required" };
  }

  if (!isValidLatitude(body.latitude) || !isValidLongitude(body.longitude)) {
    return { ok: false, error: "Invalid coordinates" };
  }

  const label = normalizeLocationLabel(body.label);
  if (body.label != null && body.label !== "" && label === null) {
    return {
      ok: false,
      error: `Label must be 1–${LOCATION_LABEL_MAX_LENGTH} characters`,
    };
  }

  const accuracyM = normalizeAccuracyM(body.accuracyM);
  if (body.accuracyM != null && accuracyM === null) {
    return { ok: false, error: "Invalid accuracy value" };
  }

  return {
    ok: true,
    data: {
      latitude: body.latitude,
      longitude: body.longitude,
      accuracyM,
      label,
    },
  };
}

export function formatLocationAge(createdAt: number, now = Date.now()): string {
  const diffMs = Math.max(0, now - createdAt);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function isLocationStale(createdAt: number, now = Date.now()): boolean {
  return now - createdAt > LOCATION_STALE_MS;
}

export function buildMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function formatAccuracyM(accuracyM: number | null): string | null {
  if (accuracyM == null) return null;
  if (accuracyM < 1000) return `±${Math.round(accuracyM)} m`;
  return `±${(accuracyM / 1000).toFixed(1)} km`;
}

export function serializeLocationPayload(data: LocationShareInput): string {
  return JSON.stringify({
    latitude: data.latitude,
    longitude: data.longitude,
    accuracyM: data.accuracyM,
    label: data.label,
  });
}

export function parseLocationPayload(
  json: string | null | undefined,
): LocationShareInput | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as {
      latitude?: unknown;
      longitude?: unknown;
      accuracyM?: unknown;
      accuracy_m?: unknown;
      label?: unknown;
    };
    if (!parsed || typeof parsed !== "object") return null;

    const result = parseLocationShareBody({
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      accuracyM: parsed.accuracyM ?? parsed.accuracy_m,
      label: parsed.label,
    });
    return result.ok ? result.data : null;
  } catch {
    return null;
  }
}
