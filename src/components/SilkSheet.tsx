import { useState, type ReactElement, type ReactNode } from "react";
import { Sheet } from "@silk-hq/components";

export const SILK_LICENSE = "non-commercial" as const;

interface SilkBottomSheetProps {
  title: string;
  tall?: boolean;
  /** Single element rendered as the sheet's present trigger. */
  trigger?: ReactElement;
  /** Controlled hybrid: required when the sheet must close programmatically (async sends). */
  presented?: boolean;
  onPresentedChange?: (presented: boolean) => void;
  children: ReactNode;
}

/**
 * Shared Silk bottom-sheet shell: native `Sheet.Trigger` open,
 * swipe/backdrop/Escape dismiss, `Sheet.Title` accessible name.
 * Pass `presented` + `onPresentedChange` for async-close flows.
 *
 * Content is inert until the sheet settles (`idleInside`): Silk drops
 * programmatic dismisses issued while entering, so interacting earlier
 * can leave auto-close (e.g. after an async send) without effect.
 */
export function SilkBottomSheet({
  title,
  tall = false,
  trigger,
  presented,
  onPresentedChange,
  children,
}: SilkBottomSheetProps) {
  const [settled, setSettled] = useState(false);
  return (
    <Sheet.Root
      license={SILK_LICENSE}
      sheetRole="dialog"
      presented={presented}
      onPresentedChange={onPresentedChange}
      className="silk-sheet-root"
    >
      {trigger ? <Sheet.Trigger asChild>{trigger}</Sheet.Trigger> : null}
      <Sheet.Portal>
        <Sheet.View
          className="silk-sheet-view"
          nativeEdgeSwipePrevention={true}
          onTravelStatusChange={(status) => setSettled(status === "idleInside")}
        >
          <Sheet.Backdrop className="silk-sheet-backdrop" themeColorDimming="auto" />
          <Sheet.Content
            className={
              tall ? "silk-sheet-content silk-sheet-content--tall" : "silk-sheet-content"
            }
          >
            <Sheet.BleedingBackground className="silk-sheet-bg" />
            <Sheet.Handle className="silk-sheet-handle" aria-hidden="true">
              {""}
            </Sheet.Handle>
            <div className="silk-sheet-header">
              <Sheet.Title className="silk-sheet-title">{title}</Sheet.Title>
              <Sheet.Trigger action="dismiss" asChild>
                <button type="button" className="silk-sheet-close" aria-label="Close">
                  ×
                </button>
              </Sheet.Trigger>
            </div>
            <div className="silk-sheet-body" inert={!settled}>
              {children}
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
