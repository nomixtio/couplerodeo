import { LocationComposer } from "./LocationComposer";
import { BottomSheet } from "./BottomSheet";

interface LocationComposerSheetProps {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export function LocationComposerSheet({
  open,
  onClose,
  onSent,
}: LocationComposerSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Share location">
      {open && (
        <LocationComposer
          onSent={() => {
            onSent?.();
            onClose();
          }}
        />
      )}
    </BottomSheet>
  );
}
