interface QuestionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  "aria-label"?: string;
}

export function QuestionButton({
  onClick,
  disabled = false,
  className = "",
  title = "Ask a question",
  "aria-label": ariaLabel = "Ask a question",
}: QuestionButtonProps) {
  return (
    <button
      type="button"
      className={`gif-btn${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
    >
      ?
    </button>
  );
}
