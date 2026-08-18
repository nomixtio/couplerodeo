interface GifButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  "aria-label"?: string;
}

export function GifButton({
  onClick,
  disabled = false,
  className = "",
  title = "GIF",
  "aria-label": ariaLabel = "GIF",
}: GifButtonProps) {
  return (
    <button
      type="button"
      className={`gif-btn${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
    >
      GIF
    </button>
  );
}
