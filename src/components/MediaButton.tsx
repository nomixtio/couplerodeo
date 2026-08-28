interface MediaButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: boolean | "menu";
}

export function MediaButton({
  onClick,
  disabled = false,
  className = "",
  title = "Add a picture or video",
  "aria-label": ariaLabel = "Add a picture or video",
  "aria-expanded": ariaExpanded,
  "aria-haspopup": ariaHasPopup,
}: MediaButtonProps) {
  return (
    <button
      type="button"
      className={`gif-btn${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3"
          y="6"
          width="18"
          height="14"
          rx="2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <circle cx="8.5" cy="10.5" r="1.4" fill="currentColor" />
        <path
          d="M7 18.5 11.2 13l2.4 2.6 2.1-2.5L21 18.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
