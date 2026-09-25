import { useState, type ReactElement } from "react";
import { Sheet } from "@silk-hq/components";
import { EmojiPicker } from "./EmojiPicker";
import { GiphyPicker } from "./GiphyPicker";
import { SILK_LICENSE } from "./SilkSheet";

export type ReactionTab = "gif" | "emoji";

interface ReactionPickerSheetProps {
  gifTrigger: ReactElement;
  emojiTrigger: ReactElement;
  onSelectGif: (gifUrl: string) => Promise<void>;
  onSelectEmoji: (hexcode: string) => Promise<void>;
}

export function ReactionPickerSheet({
  gifTrigger,
  emojiTrigger,
  onSelectGif,
  onSelectEmoji,
}: ReactionPickerSheetProps) {
  const [presented, setPresented] = useState(false);
  const [tab, setTab] = useState<ReactionTab>("gif");
  const [settled, setSettled] = useState(false);

  const heading = tab === "gif" ? "React with GIF" : "React with emoji";

  return (
    <Sheet.Root
      license={SILK_LICENSE}
      sheetRole="dialog"
      presented={presented}
      onPresentedChange={setPresented}
      className="silk-sheet-root"
    >
      <Sheet.Trigger asChild onPress={() => setTab("gif")}>
        {gifTrigger}
      </Sheet.Trigger>
      <Sheet.Trigger asChild onPress={() => setTab("emoji")}>
        {emojiTrigger}
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View
          className="silk-sheet-view"
          nativeEdgeSwipePrevention={true}
          onTravelStatusChange={(status) => setSettled(status === "idleInside")}
        >
          <Sheet.Backdrop className="silk-sheet-backdrop" themeColorDimming="auto" />
          <Sheet.Content className="silk-sheet-content silk-sheet-content--tall">
            <Sheet.BleedingBackground className="silk-sheet-bg" />
            <Sheet.Handle className="silk-sheet-handle" aria-hidden="true">
              {""}
            </Sheet.Handle>
            <div className="silk-sheet-header">
              <Sheet.Title className="silk-sheet-title">{heading}</Sheet.Title>
              <Sheet.Trigger action="dismiss" asChild>
                <button type="button" className="silk-sheet-close" aria-label="Close">
                  ×
                </button>
              </Sheet.Trigger>
            </div>
            {presented ? (
              <div className="reaction-picker-sheet" inert={!settled}>
                <div
                  className="section-tabs reaction-picker-tabs"
                  role="tablist"
                  aria-label="Reaction type"
                >
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
                  <GiphyPicker
                    variant="sheet"
                    onSelect={async (gifUrl) => {
                      await onSelectGif(gifUrl);
                      setPresented(false);
                    }}
                  />
                ) : (
                  <EmojiPicker
                    onSelect={async (hexcode) => {
                      await onSelectEmoji(hexcode);
                      setPresented(false);
                    }}
                  />
                )}
              </div>
            ) : null}
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
