import { useCallback, useEffect, useRef, useState } from "react";
import { planMediaMosaicSrc } from "../../shared/plans";
import {
  deletePlanMedia,
  fetchPlanMedia,
  fetchPlanMediaItem,
  updatePlanMedia,
  type PlanMedia,
} from "../lib/api";
import { PlanMediaViewer } from "./PlanMediaViewer";

interface PlanMediaGalleryProps {
  planId: string;
  refreshKey?: number;
  onMediaChange?: () => void;
}

function mosaicTileClass(index: number): string {
  if (index % 7 === 0) return "plan-media-tile plan-media-tile--feature";
  if (index % 3 === 0) return "plan-media-tile plan-media-tile--wide";
  return "plan-media-tile";
}

function isViewable(item: PlanMedia): boolean {
  if (item.type === "image") return Boolean(planMediaMosaicSrc(item));
  return item.status === "ready" || item.status === "processing";
}

export function PlanMediaGallery({
  planId,
  refreshKey = 0,
  onMediaChange,
}: PlanMediaGalleryProps) {
  const [media, setMedia] = useState<PlanMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (viewerIndex != null && viewerIndex >= media.length) {
      setViewerIndex(media.length > 0 ? media.length - 1 : null);
    }
  }, [media.length, viewerIndex]);

  useEffect(() => {
    const processing = media.filter(
      (item) => item.type === "video" && item.status === "processing",
    );
    if (processing.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (pollRef.current) return;

    pollRef.current = setInterval(() => {
      Promise.all(
        processing.map((item) => fetchPlanMediaItem(planId, item.id)),
      )
        .then((results) => {
          setMedia((current) =>
            current.map((item) => {
              const updated = results.find((r) => r.media.id === item.id);
              return updated ? updated.media : item;
            }),
          );
          onMediaChange?.();
        })
        .catch(console.error);
    }, 4000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [media, planId, onMediaChange]);

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

  if (loading) return <p className="hint">Loading media…</p>;

  return (
    <section className="plan-media-gallery">
      {error && <p className="hint error">{error}</p>}

      {media.length === 0 ? (
        <p className="hint plan-media-empty">
          No photos or videos yet. Tap <strong>+</strong> above to add some.
        </p>
      ) : (
        <div className="plan-media-mosaic">
          {media.map((item, index) => {
            const mosaicSrc = planMediaMosaicSrc(item);
            const viewable = isViewable(item);

            return (
              <figure key={item.id} className={mosaicTileClass(index)}>
                <button
                  type="button"
                  className="plan-media-tile-button"
                  disabled={!viewable}
                  aria-label={
                    item.type === "video" ? "Open video" : "Open photo"
                  }
                  onClick={() => setViewerIndex(index)}
                >
                  {item.type === "image" && mosaicSrc ? (
                    <img src={mosaicSrc} alt="" loading="lazy" />
                  ) : item.type === "video" && mosaicSrc ? (
                    <>
                      <img src={mosaicSrc} alt="" loading="lazy" />
                      <span className="plan-media-play-icon" aria-hidden>
                        ▶
                      </span>
                    </>
                  ) : item.type === "video" && item.status === "processing" ? (
                    <span className="plan-media-processing">Processing…</span>
                  ) : mosaicSrc ? (
                    <img src={mosaicSrc} alt="" loading="lazy" />
                  ) : (
                    <span className="plan-media-processing">Unavailable</span>
                  )}
                  {item.type === "video" && item.status === "ready" && (
                    <span className="plan-media-type-badge" aria-hidden>
                      Video
                    </span>
                  )}
                </button>
              </figure>
            );
          })}
        </div>
      )}

      {viewerIndex != null && media[viewerIndex] && (
        <PlanMediaViewer
          key={media[viewerIndex].id}
          items={media}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onSetCover={handleSetCover}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}
