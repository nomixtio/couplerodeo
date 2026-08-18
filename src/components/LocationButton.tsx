interface LocationButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  "aria-label"?: string;
}

export function LocationButton({
  onClick,
  disabled = false,
  className = "",
  title = "Share location",
  "aria-label": ariaLabel = "Share location",
}: LocationButtonProps) {
  return (
    <button
      type="button"
      className={`gif-btn${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10" r="2.25" fill="currentColor" />
      </svg>
    </button>
  );
}
