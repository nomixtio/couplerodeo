import { GiphyPicker } from "./GiphyPicker";
import { BottomSheet } from "./BottomSheet";

interface GiphyPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => Promise<void>;
  title?: string;
}

export function GiphyPickerSheet({
  open,
  onClose,
  onSelect,
  title = "React with GIF",
}: GiphyPickerSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} tall>
      <GiphyPicker variant="sheet" onSelect={onSelect} onCancel={onClose} />
    </BottomSheet>
  );
}
