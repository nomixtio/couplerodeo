import type { ButtonHTMLAttributes, Ref } from "react";

interface QuestionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title?: string;
  "aria-label"?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function QuestionButton({
  disabled = false,
  className = "",
  title = "Ask a question",
  "aria-label": ariaLabel = "Ask a question",
  ref,
  ...rest
}: QuestionButtonProps) {
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
      ?
    </button>
  );
}
