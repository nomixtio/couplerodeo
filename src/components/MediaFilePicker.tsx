import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MediaButton } from "./MediaButton";

interface MediaFilePickerProps {
  disabled?: boolean;
  uploading?: boolean;
  progress?: string;
  error?: string;
  variant?: "plus" | "icon";
  menuPlacement?: "below" | "above";
  showCamera?: boolean;
  multiple?: boolean;
  onSelectFiles: (files: File[]) => void;
}

function MenuItems({
  onPick,
  showCamera,
}: {
  onPick: (kind: "photos" | "videos" | "camera") => void;
  showCamera: boolean;
}) {
  return (
    <>
      <button type="button" role="menuitem" onClick={() => onPick("photos")}>
        Add a picture
      </button>
      <button type="button" role="menuitem" onClick={() => onPick("videos")}>
        Add a video
      </button>
      {showCamera ? (
        <button type="button" role="menuitem" onClick={() => onPick("camera")}>
          Take a picture
        </button>
      ) : null}
    </>
  );
}

export function MediaFilePicker({
  disabled = false,
  uploading = false,
  progress = "",
  error = "",
  variant = "plus",
  menuPlacement = "below",
  showCamera = true,
  multiple = true,
  onSelectFiles,
}: MediaFilePickerProps) {
  const [open, setOpen] = useState(false);
  const [fixedPos, setFixedPos] = useState<{
    bottom: number;
    left: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || menuPlacement !== "above") {
      setFixedPos(null);
      return;
    }

    function updatePos() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setFixedPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left + rect.width / 2,
      });
    }

    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [open, menuPlacement]);

  function openPicker(kind: "photos" | "videos" | "camera") {
    setOpen(false);
    if (kind === "photos") photoInputRef.current?.click();
    else if (kind === "videos") videoInputRef.current?.click();
    else if (showCamera) cameraInputRef.current?.click();
  }

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    onSelectFiles(multiple ? files : files.slice(0, 1));
  }

  const busy = disabled || uploading;
  const menu = (
    <div
      ref={panelRef}
      className={`media-file-picker-menu${menuPlacement === "above" ? " media-file-picker-menu--above" : ""}`}
      role="menu"
      style={
        menuPlacement === "above" && fixedPos
          ? {
              position: "fixed",
              top: "auto",
              right: "auto",
              bottom: fixedPos.bottom,
              left: fixedPos.left,
              transform: "translateX(-50%)",
            }
          : undefined
      }
    >
      <MenuItems onPick={openPicker} showCamera={showCamera} />
    </div>
  );

  return (
    <div
      className={`media-file-picker${variant === "icon" ? " media-file-picker--icon" : ""}`}
      ref={rootRef}
    >
      {variant === "icon" ? (
        <MediaButton
          className="update-action-btn"
          disabled={busy}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
        />
      ) : (
        <button
          type="button"
          className="btn ghost page-header-toggle-btn"
          aria-label="Add a picture or video"
          aria-expanded={open}
          aria-haspopup="menu"
          disabled={busy}
          onClick={() => setOpen((value) => !value)}
        >
          {uploading ? "…" : "+"}
        </button>
      )}

      {open &&
        (menuPlacement === "above"
          ? createPortal(menu, document.body)
          : menu)}

      {variant !== "icon" && progress && (
        <span className="hint media-file-picker-progress">{progress}</span>
      )}
      {variant !== "icon" && error && (
        <span className="hint error media-file-picker-error">{error}</span>
      )}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple={multiple}
        hidden
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {showCamera ? (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      ) : null}
    </div>
  );
}
