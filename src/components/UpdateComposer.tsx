import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sheet } from "@silk-hq/components";
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
import { SILK_LICENSE } from "./SilkSheet";

interface UpdateComposerProps {
  onSent?: () => void;
  partnerName?: string | null;
  variant?: "default" | "footer";
  onHeightChange?: (height: number) => void;
}

const EXPANDED_BODY_MAX_HEIGHT = 256;

/** Rough collapsed chrome (grabber + action bar + paddings) used until measured. */
const COLLAPSED_CHROME_ESTIMATE = 124;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

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
  const [quickUpdates, setQuickUpdates] = useState<QuickUpdateItem[]>(() =>
    defaultQuickUpdateItems(),
  );
  const [expandedHeight, setExpandedHeight] = useState(EXPANDED_BODY_MAX_HEIGHT);
  const keyboardInset = useKeyboardInset();
  const presetsMeasureRef = useRef<HTMLDivElement>(null);
  const innerMeasureRef = useRef<HTMLDivElement>(null);
  const iconItems = useMemo(
    () => quickUpdateIconItems(quickUpdates),
    [quickUpdates],
  );
  const collapsedHeight = quickUpdateCollapsedHeight(iconItems.length);

  // Persistent Silk sheet state: detent 1 = collapsed (icons), detent 2 = expanded (chips).
  const [activeDetent, setActiveDetent] = useState(1);
  const [openProgress, setOpenProgress] = useState(0);
  const [measuredExpandedTotal, setMeasuredExpandedTotal] = useState(0);
  const heightsRef = useRef({ collapsedTotal: 0, expandedTotal: 0 });
  const openProgressRef = useRef(0);
  const activeDetentRef = useRef(1);
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;

  const reportVisibleHeight = useCallback((progress: number) => {
    const { collapsedTotal, expandedTotal } = heightsRef.current;
    if (collapsedTotal <= 0 || expandedTotal <= 0) return;
    onHeightChangeRef.current?.(
      Math.round(collapsedTotal + progress * (expandedTotal - collapsedTotal)),
    );
  }, []);

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

  // Measure the full expanded sheet content (grabber + actions + body + status,
  // including safe-area + keyboard padding). The collapsed detent is derived by
  // swapping the expanded body for the collapsed icon row.
  useEffect(() => {
    if (variant !== "footer") return;
    const node = innerMeasureRef.current;
    if (!node) return;

    const measure = () => {
      // innerMeasure includes safe-area + keyboard padding, so offsetHeight is
      // the full expanded sheet height.
      const expandedTotal = node.offsetHeight;
      const collapsedTotal = expandedTotal - expandedHeight + collapsedHeight;
      heightsRef.current = { collapsedTotal, expandedTotal };
      setMeasuredExpandedTotal(expandedTotal);
      reportVisibleHeight(openProgressRef.current);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [variant, expandedHeight, collapsedHeight, keyboardInset, quickUpdates, reportVisibleHeight]);

  const handleActiveDetentChange = useCallback(
    (detent: number) => {
      activeDetentRef.current = detent;
      setActiveDetent(detent);
      const progress = detent === 2 ? 1 : 0;
      openProgressRef.current = progress;
      setOpenProgress(progress);
      reportVisibleHeight(progress);
    },
    [reportVisibleHeight],
  );

  const handleTravel = useCallback(
    ({
      progress,
      progressAtDetents,
    }: {
      progress: number;
      progressAtDetents?: number[];
    }) => {
      const atCollapsed = progressAtDetents?.[1];
      const atExpanded = progressAtDetents?.[2];
      let next: number;
      if (
        typeof atCollapsed === "number" &&
        typeof atExpanded === "number" &&
        atExpanded > atCollapsed
      ) {
        next = clamp01((progress - atCollapsed) / (atExpanded - atCollapsed));
      } else {
        next = activeDetentRef.current === 2 ? 1 : 0;
      }
      openProgressRef.current = next;
      setOpenProgress(next);
      reportVisibleHeight(next);
    },
    [reportVisibleHeight],
  );

  const collapseDrawer = useCallback(() => {
    if (activeDetentRef.current !== 1) handleActiveDetentChange(1);
  }, [handleActiveDetentChange]);

  const toggleDetent = useCallback(() => {
    handleActiveDetentChange(activeDetentRef.current === 2 ? 1 : 2);
  }, [handleActiveDetentChange]);

  const sendUpdate = useCallback(
    async (updateText: string) => {
      setError("");
      setSending(true);
      try {
        await createUpdate(updateText);
        setText("");
        collapseDrawer();
        onSent?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
      } finally {
        setSending(false);
      }
    },
    [onSent, collapseDrawer],
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
        collapseDrawer();
        onSent?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
      } finally {
        setSending(false);
        setProgress("");
      }
    },
    [onSent, collapseDrawer],
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

  // Collapsed detent = full expanded height minus the body delta. Until the
  // first measurement lands, fall back to a chrome estimate so the sheet still
  // rests on a sensible collapsed stop on first present.
  const collapsedDetentPx =
    measuredExpandedTotal > 0
      ? Math.max(1, Math.round(measuredExpandedTotal - expandedHeight + collapsedHeight))
      : collapsedHeight + COLLAPSED_CHROME_ESTIMATE;

  const showCollapsedLayer = openProgress < 0.65;
  const showExpandedLayer = openProgress > 0.35;

  return (
    <Sheet.Root
      license={SILK_LICENSE}
      defaultPresented
      defaultActiveDetent={1}
      activeDetent={activeDetent}
      onActiveDetentChange={handleActiveDetentChange}
      className="update-persistent-root"
    >
      <Sheet.Portal>
        <Sheet.View
          className="update-persistent-view"
          contentPlacement="bottom"
          detents={`${collapsedDetentPx}px`}
          swipeDismissal={false}
          inertOutside={false}
          onClickOutside={{ dismiss: false, stopOverlayPropagation: false }}
          onEscapeKeyDown={{ dismiss: false, stopOverlayPropagation: false }}
          onPresentAutoFocus={{ focus: false }}
          nativeEdgeSwipePrevention={true}
          onTravel={handleTravel}
        >
          <Sheet.Content className="update-persistent-content">
            <Sheet.BleedingBackground className="silk-sheet-bg" />
            <Sheet.Title className="silk-visually-hidden">Quick updates</Sheet.Title>
            {/* inertOutside=false + no Backdrop requires SpecialWrapper for
                swipeability (Silk Safari workaround). */}
            <Sheet.SpecialWrapper.Root>
              <Sheet.SpecialWrapper.Content>
                <div
                  ref={innerMeasureRef}
                  className="update-persistent-inner"
                  style={{
                    paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)`,
                  }}
                >
                  <Sheet.Trigger
                    action="step"
                    asChild
                    onPress={(event) => {
                      // Deterministic toggle instead of the default cycle.
                      event.changeDefault({ runAction: false });
                      toggleDetent();
                    }}
                  >
                    <div
                      className="update-persistent-grabber"
                      role="button"
                      aria-label={
                        activeDetent === 2 ? "Collapse quick updates" : "Expand quick updates"
                      }
                    >
                      <Sheet.Handle className="silk-sheet-handle" aria-hidden="true">
                        {""}
                      </Sheet.Handle>
                    </div>
                  </Sheet.Trigger>

                  <div
                    className="update-drawer-actions update-persistent-actions"
                    role="group"
                    aria-label="Compose an update"
                  >
                    <TextComposerSheet
                      trigger={
                        <button
                          type="button"
                          className="gif-btn update-action-btn"
                          disabled={sending}
                          aria-label="Type an update"
                          title="Type an update"
                        >
                          abc
                        </button>
                      }
                      onSent={() => {
                        collapseDrawer();
                        onSent?.();
                      }}
                    />
                    <GiphyPickerSheet
                      trigger={
                        <GifButton
                          className="update-action-btn"
                          disabled={sending}
                          aria-label="Send a GIF"
                          title="Send a GIF"
                        />
                      }
                      title="Send a GIF"
                      onSelect={sendUpdate}
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
                    <QuestionComposerSheet
                      trigger={
                        <QuestionButton
                          className="update-action-btn"
                          disabled={sending}
                          aria-label="Ask a question"
                          title="Ask a question"
                        />
                      }
                      partnerName={partnerName}
                      onSent={() => {
                        collapseDrawer();
                        onSent?.();
                      }}
                    />
                    <LocationComposerSheet
                      trigger={
                        <LocationButton
                          className="update-action-btn"
                          disabled={sending}
                          aria-label="Share location"
                          title="Share location"
                        />
                      }
                      onSent={() => {
                        collapseDrawer();
                        onSent?.();
                      }}
                    />
                  </div>

                  <div
                    className="update-persistent-body"
                    style={{ height: expandedHeight }}
                  >
                    <div
                      className="update-drawer-collapsed"
                      style={{
                        opacity: 1 - openProgress,
                        pointerEvents: showCollapsedLayer ? "auto" : "none",
                      }}
                      aria-hidden={!showCollapsedLayer}
                      inert={!showCollapsedLayer}
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
                            tabIndex={showCollapsedLayer ? undefined : -1}
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
                        pointerEvents: showExpandedLayer ? "auto" : "none",
                      }}
                      aria-hidden={!showExpandedLayer}
                      inert={!showExpandedLayer}
                    >
                      <div ref={presetsMeasureRef} className="update-drawer-presets">
                        {quickUpdates.map((update) => (
                          <button
                            key={update.id}
                            type="button"
                            className={`update-preset-chip${update.icon ? " update-preset-chip--with-icon" : ""}`}
                            disabled={sending}
                            onClick={() => sendUpdate(update.text).catch(console.error)}
                            tabIndex={showExpandedLayer ? undefined : -1}
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
                  {progress && <p className="hint update-composer-error">{progress}</p>}
                  {error && <p className="hint error update-composer-error">{error}</p>}
                </div>
              </Sheet.SpecialWrapper.Content>
            </Sheet.SpecialWrapper.Root>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
