import { useState, type ReactElement } from "react";
import { LocationComposer } from "./LocationComposer";
import { SilkBottomSheet } from "./SilkSheet";

interface LocationComposerSheetProps {
  trigger: ReactElement;
  onSent?: () => void;
}

export function LocationComposerSheet({
  trigger,
  onSent,
}: LocationComposerSheetProps) {
  const [presented, setPresented] = useState(false);
  const [session, setSession] = useState(0);

  return (
    <SilkBottomSheet
      title="Share location"
      trigger={trigger}
      presented={presented}
      onPresentedChange={(next) => {
        if (next) setSession((value) => value + 1);
        setPresented(next);
      }}
    >
      {presented ? (
        <LocationComposer
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
