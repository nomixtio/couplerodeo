import { TextComposer } from "./TextComposer";
import { BottomSheet } from "./BottomSheet";

interface TextComposerSheetProps {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export function TextComposerSheet({
  open,
  onClose,
  onSent,
}: TextComposerSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Send an update">
      {open && (
        <TextComposer
          onSent={() => {
            onSent?.();
            onClose();
          }}
        />
      )}
    </BottomSheet>
  );
}
