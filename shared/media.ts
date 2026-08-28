export const COUPLE_MAX_IMAGES = 500;
export const COUPLE_MAX_VIDEOS = 100;

export type MediaSource = "plan" | "update" | "other";

export type MediaFilter = "all" | "plan" | "update" | "other" | "removed";

export type MediaType = "image" | "video";

export type MediaStatus = "ready" | "processing" | "failed";

export interface MediaPayload {
  mediaId: string;
}

export const MEDIA_SOURCES: readonly MediaSource[] = [
  "plan",
  "update",
  "other",
];

export const MEDIA_FILTERS: readonly MediaFilter[] = [
  "all",
  "plan",
  "update",
  "other",
  "removed",
];

export const MEDIA_FILTER_LABELS: Record<MediaFilter, string> = {
  all: "All",
  plan: "Plans",
  update: "Updates",
  other: "Other",
  removed: "Removed",
};

export const MEDIA_SOURCE_LABELS: Record<MediaSource, string> = {
  plan: "Plan",
  update: "Update",
  other: "Other",
};

export function isMediaSource(value: unknown): value is MediaSource {
  return value === "plan" || value === "update" || value === "other";
}

export function parseMediaFilter(
  value: string | null | undefined,
): MediaFilter {
  if (
    value === "plan" ||
    value === "update" ||
    value === "other" ||
    value === "removed"
  ) {
    return value;
  }
  return "all";
}

export function serializeMediaPayload(data: MediaPayload): string {
  return JSON.stringify({ mediaId: data.mediaId });
}

export function parseMediaPayload(
  json: string | null | undefined,
): MediaPayload | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { mediaId?: unknown; media_id?: unknown };
    if (!parsed || typeof parsed !== "object") return null;
    const mediaId =
      typeof parsed.mediaId === "string"
        ? parsed.mediaId
        : typeof parsed.media_id === "string"
          ? parsed.media_id
          : "";
    const trimmed = mediaId.trim();
    if (!trimmed) return null;
    return { mediaId: trimmed };
  } catch {
    return null;
  }
}

export function countCoupleMediaLimits(
  imageCount: number,
  videoCount: number,
): { ok: true } | { ok: false; error: string } {
  if (imageCount >= COUPLE_MAX_IMAGES) {
    return { ok: false, error: `Maximum ${COUPLE_MAX_IMAGES} photos` };
  }
  if (videoCount >= COUPLE_MAX_VIDEOS) {
    return { ok: false, error: `Maximum ${COUPLE_MAX_VIDEOS} videos` };
  }
  return { ok: true };
}

export function mediaSourceLabel(
  source: MediaSource,
  planTitle?: string | null,
): string {
  if (source === "plan") {
    return planTitle?.trim() ? `Plan · ${planTitle.trim()}` : "Plan";
  }
  return MEDIA_SOURCE_LABELS[source];
}
