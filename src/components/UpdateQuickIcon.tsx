import { emojiImageUrl } from "../../shared/openmoji";
import type { QuickUpdateIcon } from "../../shared/updates";

export function UpdateQuickIcon({ icon }: { icon: QuickUpdateIcon }) {
  return (
    <img
      className="update-quick-emoji"
      src={emojiImageUrl(icon)}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}
