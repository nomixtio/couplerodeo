import type { ButtonHTMLAttributes, Ref } from "react";

interface GifButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title?: string;
  "aria-label"?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function GifButton({
  disabled = false,
  className = "",
  title = "GIF",
  "aria-label": ariaLabel = "GIF",
  ref,
  ...rest
}: GifButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={`gif-btn${className ? ` ${className}` : ""}`}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      {...rest}
    >
      GIF
    </button>
  );
}
