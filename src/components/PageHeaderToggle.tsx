interface PageHeaderToggleProps {
  mode: "add" | "close";
  onClick: () => void;
  disabled?: boolean;
  addLabel?: string;
  closeLabel?: string;
}

export function PageHeaderToggle({
  mode,
  onClick,
  disabled = false,
  addLabel = "Create",
  closeLabel = "Close",
}: PageHeaderToggleProps) {
  return (
    <button
      type="button"
      className="btn ghost page-header-toggle-btn"
      aria-label={mode === "add" ? addLabel : closeLabel}
      disabled={disabled}
      onClick={onClick}
    >
      {mode === "add" ? "+" : "×"}
    </button>
  );
}
