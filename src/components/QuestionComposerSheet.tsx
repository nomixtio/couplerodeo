import { useState, type ReactElement } from "react";
import { QuestionComposer } from "./QuestionComposer";
import { SilkBottomSheet } from "./SilkSheet";

interface QuestionComposerSheetProps {
  trigger: ReactElement;
  onSent?: () => void;
  partnerName?: string | null;
}

export function QuestionComposerSheet({
  trigger,
  onSent,
  partnerName,
}: QuestionComposerSheetProps) {
  const [presented, setPresented] = useState(false);
  const [session, setSession] = useState(0);

  return (
    <SilkBottomSheet
      title="Ask a question"
      trigger={trigger}
      presented={presented}
      onPresentedChange={(next) => {
        if (next) setSession((value) => value + 1);
        setPresented(next);
      }}
    >
      {presented ? (
        <QuestionComposer
          key={session}
          partnerName={partnerName}
          onSent={() => {
            onSent?.();
            setPresented(false);
          }}
        />
      ) : null}
    </SilkBottomSheet>
  );
}
