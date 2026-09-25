import { useState, type ReactElement } from "react";
import { GiphyPicker } from "./GiphyPicker";
import { SilkBottomSheet } from "./SilkSheet";

interface GiphyPickerSheetProps {
  trigger: ReactElement;
  onSelect: (gifUrl: string) => Promise<void>;
  title?: string;
}

export function GiphyPickerSheet({
  trigger,
  onSelect,
  title = "React with GIF",
}: GiphyPickerSheetProps) {
  const [presented, setPresented] = useState(false);

  return (
    <SilkBottomSheet
      title={title}
      tall
      trigger={trigger}
      presented={presented}
      onPresentedChange={setPresented}
    >
      {presented ? (
        <GiphyPicker
          variant="sheet"
          onSelect={async (gifUrl) => {
            await onSelect(gifUrl);
            setPresented(false);
          }}
        />
      ) : null}
    </SilkBottomSheet>
  );
}
