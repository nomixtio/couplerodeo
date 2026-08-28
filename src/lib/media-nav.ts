import { MEDIA_FILTER_LABELS, parseMediaFilter, type MediaFilter } from "../../shared/media";

export type MediaTypeFilter = "all" | "photos" | "videos";

export function parseMediaTypeFilter(
  value: string | null | undefined,
): MediaTypeFilter {
  if (value === "photos" || value === "videos") return value;
  return "all";
}

export function toggleMediaTypeFilter(
  current: MediaTypeFilter,
  target: "photos" | "videos",
): MediaTypeFilter {
  const showPhotos = current === "all" || current === "photos";
  const showVideos = current === "all" || current === "videos";
  const nextPhotos = target === "photos" ? !showPhotos : showPhotos;
  const nextVideos = target === "videos" ? !showVideos : showVideos;
  if (!nextPhotos && !nextVideos) return current;
  if (nextPhotos && nextVideos) return "all";
  return nextPhotos ? "photos" : "videos";
}

export { MEDIA_FILTER_LABELS, parseMediaFilter, type MediaFilter };
