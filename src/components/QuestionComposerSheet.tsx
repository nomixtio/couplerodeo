import { QuestionComposer } from "./QuestionComposer";
import { BottomSheet } from "./BottomSheet";

interface QuestionComposerSheetProps {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  partnerName?: string | null;
}

export function QuestionComposerSheet({
  open,
  onClose,
  onSent,
  partnerName,
}: QuestionComposerSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Ask a question">
      {open && (
        <QuestionComposer
          partnerName={partnerName}
          onSent={() => {
            onSent?.();
            onClose();
          }}
        />
      )}
    </BottomSheet>
  );
}
