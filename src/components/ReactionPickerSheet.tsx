import { useEffect, useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { EmojiPicker } from "./EmojiPicker";
import { GiphyPicker } from "./GiphyPicker";

export type ReactionTab = "gif" | "emoji";

interface ReactionPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => Promise<void>;
  onSelectEmoji: (hexcode: string) => Promise<void>;
  initialTab?: ReactionTab;
  title?: string;
}

export function ReactionPickerSheet({
  open,
  onClose,
  onSelectGif,
  onSelectEmoji,
  initialTab = "gif",
  title,
}: ReactionPickerSheetProps) {
  const [tab, setTab] = useState<ReactionTab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const heading =
    title ?? (tab === "gif" ? "React with GIF" : "React with emoji");

  return (
    <BottomSheet open={open} onClose={onClose} title={heading} tall>
      <div className="reaction-picker-sheet">
        <div className="section-tabs reaction-picker-tabs" role="tablist" aria-label="Reaction type">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "gif"}
            className={tab === "gif" ? "active" : ""}
            onClick={() => setTab("gif")}
          >
            GIF
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "emoji"}
            className={tab === "emoji" ? "active" : ""}
            onClick={() => setTab("emoji")}
          >
            Emoji
          </button>
        </div>
        {tab === "gif" ? (
          <GiphyPicker variant="sheet" onSelect={onSelectGif} onCancel={onClose} />
        ) : (
          <EmojiPicker onSelect={onSelectEmoji} />
        )}
      </div>
    </BottomSheet>
  );
}
