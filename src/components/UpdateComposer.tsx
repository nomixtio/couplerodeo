import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  UPDATE_MAX_LENGTH,
  defaultQuickUpdateItems,
  quickUpdateCollapsedHeight,
  quickUpdateIconGridColumn,
  quickUpdateIconItems,
  type QuickUpdateItem,
} from "../../shared/updates";
import {
  createUpdate,
  createUpdateVideoUpload,
  fetchQuickUpdates,
  isImageFile,
  isVideoFile,
  uploadUpdateImage,
  uploadVideoToStream,
} from "../lib/api";
import { UpdateQuickIcon } from "./UpdateQuickIcon";
import { GifButton } from "./GifButton";
import { GiphyPickerSheet } from "./GiphyPickerSheet";
import { LocationButton } from "./LocationButton";
import { LocationComposerSheet } from "./LocationComposerSheet";
import { MediaFilePicker } from "./MediaFilePicker";
import { QuestionButton } from "./QuestionButton";
import { QuestionComposerSheet } from "./QuestionComposerSheet";
import { TextComposerSheet } from "./TextComposerSheet";

interface UpdateComposerProps {
  onSent?: () => void;
  partnerName?: string | null;
  variant?: "default" | "footer";
  onHeightChange?: (height: number) => void;
}

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
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [questionPickerOpen, setQuestionPickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [textPickerOpen, setTextPickerOpen] = useState(false);
  const [quickUpdates, setQuickUpdates] = useState<QuickUpdateItem[]>(() =>
    defaultQuickUpdateItems(),
  );
  const [expandedHeight, setExpandedHeight] = useState(EXPANDED_BODY_MAX_HEIGHT);
  const keyboardInset = useKeyboardInset();
  const presetsMeasureRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const iconItems = useMemo(
    () => quickUpdateIconItems(quickUpdates),
    [quickUpdates],
  );
  const collapsedHeight = quickUpdateCollapsedHeight(iconItems.length);

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
  } = useSwipeableDrawer(collapsedHeight, expandedHeight);

  useEffect(() => {
    fetchQuickUpdates()
      .then((data) => setQuickUpdates(data.active))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const node = presetsMeasureRef.current;
    if (!node) return;

    const measure = () => {
      const measured = Math.min(node.scrollHeight, EXPANDED_BODY_MAX_HEIGHT);
      setExpandedHeight(Math.max(collapsedHeight + 48, measured));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [collapsedHeight, quickUpdates]);

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

  const sendMediaFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setError("");
      setSending(true);
      try {
        setProgress("Uploading…");
        if (isImageFile(file)) {
          await uploadUpdateImage(file);
        } else if (isVideoFile(file)) {
          const { uploadURL } = await createUpdateVideoUpload();
          await uploadVideoToStream(uploadURL, file);
        } else {
          throw new Error(`Unsupported file: ${file.name}`);
        }
        setDrawerOpen(false);
        onSent?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
      } finally {
        setSending(false);
        setProgress("");
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
          {quickUpdates.map((update) => (
            <button
              key={update.id}
              type="button"
              className={`update-preset-chip${update.icon ? " update-preset-chip--with-icon" : ""}`}
              disabled={sending}
              onClick={() => sendUpdate(update.text).catch(console.error)}
            >
              {update.icon ? (
                <span className="update-preset-chip-icon" aria-hidden="true">
                  <UpdateQuickIcon icon={update.icon} />
                </span>
              ) : null}
              {update.text}
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
            <div
              className="update-drawer-quick"
              data-count={iconItems.length}
            >
              {iconItems.map((preset, index) => (
                <button
                  key={preset.id}
                  type="button"
                  className="update-quick-btn"
                  disabled={sending}
                  title={preset.text}
                  aria-label={preset.text}
                  style={{
                    gridColumn: `${quickUpdateIconGridColumn(iconItems.length, index)} / span 2`,
                  }}
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
              {quickUpdates.map((update) => (
                <button
                  key={update.id}
                  type="button"
                  className={`update-preset-chip${update.icon ? " update-preset-chip--with-icon" : ""}`}
                  disabled={sending}
                  onClick={() => sendUpdate(update.text).catch(console.error)}
                >
                  {update.icon ? (
                    <span className="update-preset-chip-icon" aria-hidden="true">
                      <UpdateQuickIcon icon={update.icon} />
                    </span>
                  ) : null}
                  <span>{update.text}</span>
                </button>
              ))}
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
        <MediaFilePicker
          variant="icon"
          menuPlacement="above"
          showCamera={false}
          multiple={false}
          disabled={sending}
          uploading={sending}
          progress={progress}
          error={error}
          onSelectFiles={(files) => sendMediaFiles(files).catch(console.error)}
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
      {progress && <p className="hint update-composer-error">{progress}</p>}
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
