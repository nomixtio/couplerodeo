import { useEffect } from "react";
import { createPortal } from "react-dom";
import { GiphyPicker } from "./GiphyPicker";

interface GiphyPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => Promise<void>;
}

export function GiphyPickerSheet({
  open,
  onClose,
  onSelect,
}: GiphyPickerSheetProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="giphy-sheet-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="giphy-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a GIF reaction"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="giphy-sheet-header">
          <h2>React with GIF</h2>
          <button
            type="button"
            className="giphy-sheet-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <GiphyPicker
          variant="sheet"
          onSelect={onSelect}
          onCancel={onClose}
        />
      </div>
    </div>,
    document.body,
  );
}
