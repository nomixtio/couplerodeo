import { useCallback, useEffect, useState } from "react";
import {
  deletePlanMedia,
  fetchPlanMedia,
  fetchPlanMediaItem,
  updatePlanMedia,
  type MediaItem,
} from "../lib/api";
import { MediaGallery } from "./MediaGallery";

interface PlanMediaGalleryProps {
  planId: string;
  refreshKey?: number;
  onMediaChange?: () => void;
}

export function PlanMediaGallery({
  planId,
  refreshKey = 0,
  onMediaChange,
}: PlanMediaGalleryProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMedia = useCallback(async () => {
    const data = await fetchPlanMedia(planId);
    setMedia(data.media);
  }, [planId]);

  useEffect(() => {
    setLoading(true);
    loadMedia()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load media");
      })
      .finally(() => setLoading(false));
  }, [loadMedia, refreshKey]);

  const refreshItem = useCallback(
    async (mediaId: string) => {
      const result = await fetchPlanMediaItem(planId, mediaId);
      setMedia((current) =>
        current.map((item) => (item.id === result.media.id ? result.media : item)),
      );
      onMediaChange?.();
      return result.media;
    },
    [planId, onMediaChange],
  );

  async function handleSetCover(mediaId: string) {
    setError("");
    await updatePlanMedia(planId, mediaId, { setCover: true });
    onMediaChange?.();
  }

  async function handleDelete(mediaId: string) {
    setError("");
    await deletePlanMedia(planId, mediaId);
    await loadMedia();
    onMediaChange?.();
  }

  return (
    <MediaGallery
      items={media}
      loading={loading}
      error={error}
      empty={
        <p className="hint plan-media-empty">
          No photos or videos yet. Tap <strong>+</strong> above to add some.
        </p>
      }
      onRefreshItem={refreshItem}
      onSetCover={handleSetCover}
      onDelete={handleDelete}
    />
  );
}
