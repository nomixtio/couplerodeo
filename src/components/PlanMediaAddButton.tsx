import { useEffect, useRef, useState } from "react";
import {
  createPlanVideoUpload,
  uploadPlanImage,
} from "../lib/api";

interface PlanMediaAddButtonProps {
  planId: string;
  onUploaded?: () => void;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

async function uploadVideo(planId: string, file: File): Promise<void> {
  const { uploadURL } = await createPlanVideoUpload(planId);
  const formData = new FormData();
  formData.append("file", file);
  const uploadRes = await fetch(uploadURL, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) {
    throw new Error(`Video upload failed (${uploadRes.status})`);
  }
}

export function PlanMediaAddButton({
  planId,
  onUploaded,
}: PlanMediaAddButtonProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mixedInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const queue = Array.from(files);
    setUploading(true);
    setError("");
    setOpen(false);

    try {
      for (let i = 0; i < queue.length; i++) {
        const file = queue[i];
        setProgress(`Uploading ${i + 1} of ${queue.length}…`);

        if (isImageFile(file)) {
          await uploadPlanImage(planId, file);
        } else if (isVideoFile(file)) {
          await uploadVideo(planId, file);
        } else {
          throw new Error(`Unsupported file: ${file.name}`);
        }
      }
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress("");
    }
  }

  function openPicker(kind: "photos" | "videos" | "mixed") {
    setOpen(false);
    if (kind === "photos") photoInputRef.current?.click();
    else if (kind === "videos") videoInputRef.current?.click();
    else mixedInputRef.current?.click();
  }

  return (
    <div className="plan-media-add" ref={menuRef}>
      <button
        type="button"
        className="btn ghost plan-media-add-btn"
        aria-label="Add photos or videos"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={uploading}
        onClick={() => setOpen((value) => !value)}
      >
        {uploading ? "…" : "+"}
      </button>

      {open && (
        <div className="plan-media-add-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => openPicker("mixed")}
          >
            Photos & videos
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => openPicker("photos")}
          >
            Photos only
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => openPicker("videos")}
          >
            Videos only
          </button>
        </div>
      )}

      {progress && <span className="hint plan-media-add-progress">{progress}</span>}
      {error && <span className="hint error plan-media-add-error">{error}</span>}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          uploadFiles(e.target.files).catch(console.error);
          e.target.value = "";
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        hidden
        onChange={(e) => {
          uploadFiles(e.target.files).catch(console.error);
          e.target.value = "";
        }}
      />
      <input
        ref={mixedInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          uploadFiles(e.target.files).catch(console.error);
          e.target.value = "";
        }}
      />
    </div>
  );
}
