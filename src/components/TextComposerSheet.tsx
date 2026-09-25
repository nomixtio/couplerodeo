import { useState, type ReactElement } from "react";
import { TextComposer } from "./TextComposer";
import { SilkBottomSheet } from "./SilkSheet";

interface TextComposerSheetProps {
  trigger: ReactElement;
  onSent?: () => void;
}

export function TextComposerSheet({ trigger, onSent }: TextComposerSheetProps) {
  const [presented, setPresented] = useState(false);
  const [session, setSession] = useState(0);

  return (
    <SilkBottomSheet
      title="Send an update"
      trigger={trigger}
      presented={presented}
      onPresentedChange={(next) => {
        if (next) setSession((value) => value + 1);
        setPresented(next);
      }}
    >
      {presented ? (
        <TextComposer
          key={session}
          onSent={() => {
            onSent?.();
            setPresented(false);
          }}
        />
      ) : null}
    </SilkBottomSheet>
  );
}
