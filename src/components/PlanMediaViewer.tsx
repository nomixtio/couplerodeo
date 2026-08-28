import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { planMediaFullSrc } from "../../shared/plans";
import type { PlanMedia } from "../lib/api";

interface PlanMediaViewerProps {
  items: PlanMedia[];
  startIndex: number;
  onClose: () => void;
  onSetCover?: (mediaId: string) => Promise<void>;
  onDelete?: (mediaId: string) => Promise<void>;
  sourceLabel?: (item: PlanMedia) => string | null;
}

function CoverIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

const SWIPE_THRESHOLD_PX = 50;

export function PlanMediaViewer({
  items,
  startIndex,
  onClose,
  onSetCover,
  onDelete,
  sourceLabel,
}: PlanMediaViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const [busy, setBusy] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const goPrev = useCallback(() => {
    setIndex((value) => Math.max(0, value - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((value) => Math.min(items.length - 1, value + 1));
  }, [items.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, onClose]);

  const item = items[index];
  if (!item) {
    return null;
  }

  const fullSrc = planMediaFullSrc(item);
  const canView =
    item.type === "image"
      ? Boolean(fullSrc)
      : item.status === "ready" && Boolean(fullSrc);

  function onSwipeStart(clientX: number, clientY: number) {
    swipeStart.current = { x: clientX, y: clientY };
  }

  function onSwipeEnd(clientX: number, clientY: number) {
    if (!swipeStart.current || busy) return;
    const dx = clientX - swipeStart.current.x;
    const dy = clientY - swipeStart.current.y;
    swipeStart.current = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) {
      return;
    }

    if (dx > 0) goPrev();
    else goNext();
  }

  async function handleSetCover() {
    if (!onSetCover) return;
    if (!window.confirm("Set this as the plan cover?")) return;
    setBusy(true);
    try {
      await onSetCover(item.id);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm("Remove this media item?")) return;
    setBusy(true);
    try {
      await onDelete(item.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="plan-media-viewer" role="dialog" aria-modal="true">
      <div
        className="plan-media-viewer-stage"
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          onSwipeStart(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => onSwipeEnd(event.clientX, event.clientY)}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
      >
        {!canView ? (
          <p className="plan-media-viewer-status">
            {item.status === "processing" ? "Processing…" : "Unavailable"}
          </p>
        ) : item.type === "image" && fullSrc ? (
          <img
            src={fullSrc}
            alt={item.caption ?? ""}
            className="plan-media-viewer-image"
            draggable={false}
          />
        ) : fullSrc ? (
          <video
            key={item.id}
            className="plan-media-viewer-video"
            controls
            autoPlay
            playsInline
            src={fullSrc}
            poster={item.thumbnail_url ?? undefined}
          />
        ) : null}

        {items.length > 1 && (
          <>
            <button
              type="button"
              className="plan-media-viewer-nav plan-media-viewer-nav--prev"
              disabled={index === 0 || busy}
              aria-label="Previous"
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="plan-media-viewer-nav plan-media-viewer-nav--next"
              disabled={index === items.length - 1 || busy}
              aria-label="Next"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
            >
              ›
            </button>
          </>
        )}

        <div className="plan-media-viewer-chrome">
          <div className="plan-media-viewer-meta">
            <p className="plan-media-viewer-counter">
              {index + 1} / {items.length}
            </p>
            {sourceLabel?.(item) && (
              <p className="plan-media-viewer-source">{sourceLabel(item)}</p>
            )}
          </div>

          <div className="plan-media-viewer-tools">
            {onSetCover && (
              <button
                type="button"
                className="plan-media-viewer-icon-btn"
                disabled={busy}
                aria-label="Set as cover"
                title="Set as cover"
                onClick={() => handleSetCover().catch(console.error)}
              >
                <CoverIcon />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="plan-media-viewer-icon-btn plan-media-viewer-icon-btn--danger"
                disabled={busy}
                aria-label="Remove"
                title="Remove"
                onClick={() => handleDelete().catch(console.error)}
              >
                <DeleteIcon />
              </button>
            )}
            <button
              type="button"
              className="plan-media-viewer-icon-btn plan-media-viewer-icon-btn--close"
              disabled={busy}
              aria-label="Close"
              title="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        {item.caption && (
          <footer className="plan-media-viewer-caption">
            <p>{item.caption}</p>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
