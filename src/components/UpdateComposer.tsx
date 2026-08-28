import { useCallback, useEffect, useRef, useState } from "react";
import {
  PREMADE_UPDATES,
  QUICK_UPDATE_PRESETS,
  UPDATE_MAX_LENGTH,
  quickUpdateIconForText,
} from "../../shared/updates";
import { createUpdate } from "../lib/api";
import { UpdateQuickIcon } from "./UpdateQuickIcon";
import { GifButton } from "./GifButton";
import { GiphyPickerSheet } from "./GiphyPickerSheet";
import { LocationButton } from "./LocationButton";
import { LocationComposerSheet } from "./LocationComposerSheet";
import { QuestionButton } from "./QuestionButton";
import { QuestionComposerSheet } from "./QuestionComposerSheet";
import { TextComposerSheet } from "./TextComposerSheet";

interface UpdateComposerProps {
  onSent?: () => void;
  partnerName?: string | null;
  variant?: "default" | "footer";
  onHeightChange?: (height: number) => void;
}

const COLLAPSED_BODY_HEIGHT = 80;
const EXPANDED_BODY_MAX_HEIGHT = 256;
const SWIPE_OPEN_THRESHOLD = 40;

function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const keyboard = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      setInset(keyboard);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}

function useSwipeableDrawer(collapsedHeight: number, expandedHeight: number) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const isDragging = bodyHeight !== null;

  const snappedHeight = drawerOpen ? expandedHeight : collapsedHeight;
  const currentHeight = bodyHeight ?? snappedHeight;
  const openProgress =
    expandedHeight === collapsedHeight
      ? 0
      : Math.max(
          0,
          Math.min(1, (currentHeight - collapsedHeight) / (expandedHeight - collapsedHeight)),
        );

  const endDrag = useCallback(
    (height: number) => {
      const midpoint = (collapsedHeight + expandedHeight) / 2;
      setDrawerOpen(height >= midpoint);
      setBodyHeight(null);
      dragRef.current = null;
    },
    [collapsedHeight, expandedHeight],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if ((event.target as HTMLElement).closest("button")) return;

      dragRef.current = {
        startY: event.clientY,
        startHeight: bodyHeight ?? snappedHeight,
      };
      setBodyHeight(bodyHeight ?? snappedHeight);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [bodyHeight, snappedHeight],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const deltaY = dragRef.current.startY - event.clientY;
      const next = Math.max(
        collapsedHeight,
        Math.min(expandedHeight, dragRef.current.startHeight + deltaY),
      );
      setBodyHeight(next);
    },
    [collapsedHeight, expandedHeight],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (dragRef.current) {
        const deltaY = dragRef.current.startY - event.clientY;
        const next = Math.max(
          collapsedHeight,
          Math.min(expandedHeight, dragRef.current.startHeight + deltaY),
        );

        if (Math.abs(deltaY) < SWIPE_OPEN_THRESHOLD) {
          setDrawerOpen((open) => !open);
        } else {
          endDrag(next);
        }
      }

      setBodyHeight(null);
      dragRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [collapsedHeight, expandedHeight, endDrag],
  );

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (dragRef.current) {
        endDrag(dragRef.current.startHeight);
      }

      setBodyHeight(null);
      dragRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [endDrag],
  );

  const onLostPointerCapture = useCallback(() => {
    setBodyHeight(null);
    dragRef.current = null;
  }, []);

  return {
    drawerOpen,
    setDrawerOpen,
    currentHeight,
    openProgress,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
  };
}

export function UpdateComposer({
  onSent,
  partnerName,
  variant = "default",
  onHeightChange,
}: UpdateComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [questionPickerOpen, setQuestionPickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [textPickerOpen, setTextPickerOpen] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(EXPANDED_BODY_MAX_HEIGHT);
  const keyboardInset = useKeyboardInset();
  const presetsMeasureRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  const {
    drawerOpen,
    setDrawerOpen,
    currentHeight,
    openProgress,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
  } = useSwipeableDrawer(COLLAPSED_BODY_HEIGHT, expandedHeight);

  useEffect(() => {
    const node = presetsMeasureRef.current;
    if (!node) return;

    const measure = () => {
      const measured = Math.min(node.scrollHeight, EXPANDED_BODY_MAX_HEIGHT);
      setExpandedHeight(Math.max(COLLAPSED_BODY_HEIGHT + 48, measured));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (variant !== "footer" || !onHeightChange) return;

    const node = footerRef.current;
    if (!node) return;

    const report = () => onHeightChange(node.offsetHeight);
    report();

    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [variant, onHeightChange]);

  const sendUpdate = useCallback(
    async (updateText: string) => {
      setError("");
      setSending(true);
      try {
        await createUpdate(updateText);
        setText("");
        setDrawerOpen(false);
        onSent?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
      } finally {
        setSending(false);
      }
    },
    [onSent, setDrawerOpen],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendUpdate(text.trim());
  }

  if (variant !== "footer") {
    return (
      <div className="update-composer">
        <div className="update-presets">
          {PREMADE_UPDATES.map((update) => (
            <button
              key={update}
              type="button"
              className="update-preset-chip"
              disabled={sending}
              onClick={() => sendUpdate(update).catch(console.error)}
            >
              {update}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="update-composer-form">
          <div className="update-composer-input-row">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type an update…"
              rows={1}
              maxLength={UPDATE_MAX_LENGTH}
              disabled={sending}
              aria-label="Update message"
            />
            <button
              type="submit"
              className="update-send-btn"
              disabled={sending || !text.trim()}
              aria-label="Send update"
            >
              ↑
            </button>
          </div>
          {error && <p className="hint error update-composer-error">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <footer
      ref={footerRef}
      className={`update-drawer${drawerOpen ? " is-open" : ""}${isDragging ? " is-dragging" : ""}`}
      style={{
        paddingBottom: `calc(1.15rem + env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)`,
      }}
    >
      <div
        className="update-drawer-sheet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
      >
        <div
          className="update-drawer-grabber"
          aria-hidden="true"
        >
          <span className="update-drawer-grabber-bar" />
          <span
            className={`update-drawer-chevron${drawerOpen ? " is-open" : ""}`}
          >
            ⌃
          </span>
        </div>

        <div
          className="update-drawer-body"
          style={{
            height: currentHeight,
            transition: isDragging ? "none" : "height 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          <div
            className="update-drawer-collapsed"
            style={{
              opacity: 1 - openProgress,
              pointerEvents: openProgress > 0.65 ? "none" : "auto",
            }}
            aria-hidden={openProgress > 0.65}
          >
            <div className="update-drawer-quick">
              {QUICK_UPDATE_PRESETS.map((preset) => (
                <button
                  key={preset.text}
                  type="button"
                  className="update-quick-btn"
                  disabled={sending}
                  title={preset.text}
                  aria-label={preset.text}
                  onClick={() => sendUpdate(preset.text).catch(console.error)}
                >
                  <UpdateQuickIcon icon={preset.icon} />
                </button>
              ))}
            </div>
          </div>

          <div
            className="update-drawer-expanded"
            style={{
              opacity: openProgress,
              pointerEvents: openProgress < 0.35 ? "none" : "auto",
            }}
            aria-hidden={openProgress < 0.35}
          >
            <div ref={presetsMeasureRef} className="update-drawer-presets">
              {PREMADE_UPDATES.map((update) => {
                const icon = quickUpdateIconForText(update);
                return (
                  <button
                    key={update}
                    type="button"
                    className={`update-preset-chip${icon ? " update-preset-chip--with-icon" : ""}`}
                    disabled={sending}
                    onClick={() => sendUpdate(update).catch(console.error)}
                  >
                    {icon && (
                      <span className="update-preset-chip-icon" aria-hidden="true">
                        <UpdateQuickIcon icon={icon} />
                      </span>
                    )}
                    <span>{update}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="update-drawer-actions" role="group" aria-label="Compose an update">
        <button
          type="button"
          className="gif-btn update-action-btn"
          disabled={sending}
          onClick={() => setTextPickerOpen(true)}
          aria-label="Type an update"
          title="Type an update"
        >
          abc
        </button>
        <GifButton
          className="update-action-btn"
          disabled={sending}
          onClick={() => setGifPickerOpen(true)}
          aria-label="Send a GIF"
          title="Send a GIF"
        />
        <QuestionButton
          className="update-action-btn"
          disabled={sending}
          onClick={() => setQuestionPickerOpen(true)}
          aria-label="Ask a question"
          title="Ask a question"
        />
        <LocationButton
          className="update-action-btn"
          disabled={sending}
          onClick={() => setLocationPickerOpen(true)}
          aria-label="Share location"
          title="Share location"
        />
      </div>
      {error && <p className="hint error update-composer-error">{error}</p>}

      <TextComposerSheet
        open={textPickerOpen}
        onClose={() => setTextPickerOpen(false)}
        onSent={() => {
          setDrawerOpen(false);
          onSent?.();
        }}
      />
      <GiphyPickerSheet
        open={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        title="Send a GIF"
        onSelect={async (gifUrl) => {
          await sendUpdate(gifUrl);
          setGifPickerOpen(false);
        }}
      />
      <QuestionComposerSheet
        open={questionPickerOpen}
        onClose={() => setQuestionPickerOpen(false)}
        partnerName={partnerName}
        onSent={() => {
          setDrawerOpen(false);
          onSent?.();
        }}
      />
      <LocationComposerSheet
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSent={() => {
          setDrawerOpen(false);
          onSent?.();
        }}
      />
    </footer>
  );
}
