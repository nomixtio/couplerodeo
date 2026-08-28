import { emojiImageUrl } from "../../shared/openmoji";

export function UpdateQuickIcon({ icon }: { icon: string }) {
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
