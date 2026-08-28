import { useEffect, useRef, useState, type ReactNode } from "react";
import { planMediaMosaicSrc } from "../../shared/plans";
import type { MediaItem } from "../lib/api";
import { PlanMediaViewer } from "./PlanMediaViewer";

interface MediaGalleryProps {
  items: MediaItem[];
  loading?: boolean;
  error?: string;
  empty: ReactNode;
  square?: boolean;
  onRefreshItem: (mediaId: string) => Promise<MediaItem>;
  onDelete?: (mediaId: string) => Promise<void>;
  onSetCover?: (mediaId: string) => Promise<void>;
  sourceLabel?: (item: MediaItem) => string | null;
}

function mosaicTileClass(index: number, square?: boolean): string {
  if (square) return "plan-media-tile";
  if (index % 7 === 0) return "plan-media-tile plan-media-tile--feature";
  if (index % 3 === 0) return "plan-media-tile plan-media-tile--wide";
  return "plan-media-tile";
}

function isViewable(item: MediaItem): boolean {
  if (item.type === "image") return Boolean(planMediaMosaicSrc(item));
  return item.status === "ready" || item.status === "processing";
}

export function MediaGallery({
  items,
  loading = false,
  error = "",
  empty,
  square = false,
  onRefreshItem,
  onDelete,
  onSetCover,
  sourceLabel,
}: MediaGalleryProps) {
  const [localItems, setLocalItems] = useState(items);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    if (viewerIndex != null && viewerIndex >= localItems.length) {
      setViewerIndex(localItems.length > 0 ? localItems.length - 1 : null);
    }
  }, [localItems.length, viewerIndex]);

  useEffect(() => {
    const processing = localItems.filter(
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
      Promise.all(processing.map((item) => onRefreshItem(item.id)))
        .then((results) => {
          setLocalItems((current) =>
            current.map((item) => {
              const updated = results.find((result) => result.id === item.id);
              return updated ?? item;
            }),
          );
        })
        .catch(console.error);
    }, 4000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [localItems, onRefreshItem]);

  async function handleSetCover(mediaId: string) {
    await onSetCover?.(mediaId);
  }

  async function handleDelete(mediaId: string) {
    await onDelete?.(mediaId);
    setLocalItems((current) => current.filter((item) => item.id !== mediaId));
  }

  if (loading) return <p className="hint">Loading media…</p>;

  return (
    <section className="plan-media-gallery">
      {error && <p className="hint error">{error}</p>}

      {localItems.length === 0 ? (
        empty
      ) : (
        <div
          className={`plan-media-mosaic${square ? " plan-media-mosaic--square" : ""}`}
        >
          {localItems.map((item, index) => {
            const mosaicSrc = planMediaMosaicSrc(item);
            const viewable = isViewable(item);

            return (
              <figure key={item.id} className={mosaicTileClass(index, square)}>
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

      {viewerIndex != null && localItems[viewerIndex] && (
        <PlanMediaViewer
          key={localItems[viewerIndex].id}
          items={localItems}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onSetCover={onSetCover ? handleSetCover : undefined}
          onDelete={onDelete ? handleDelete : undefined}
          sourceLabel={sourceLabel}
        />
      )}
    </section>
  );
}
