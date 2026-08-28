import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface PageFilterOption<T extends string> {
  value: T;
  label: string;
}

interface PageFilterProps<T extends string> {
  value: T;
  options: readonly PageFilterOption<T>[];
  label: string;
  onChange: (value: T) => void;
  active?: boolean;
  children?: ReactNode;
}

function FilterIcon() {
  return (
    <svg
      className="page-filter-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export function PageFilter<T extends string>({
  value,
  options,
  label,
  onChange,
  active,
  children,
}: PageFilterProps<T>) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const activeLabel =
    options.find((option) => option.value === value)?.label ?? value;
  const isActive = active ?? value !== options[0]?.value;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  function select(next: T) {
    setOpen(false);
    onChange(next);
  }

  return (
    <div className="page-filter-menu" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`btn ghost page-filter-btn${isActive ? " active-filter" : ""}`}
        aria-label={`${label} (${activeLabel})`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <FilterIcon />
      </button>
      {open && (
        <div id={panelId} className="page-filter-panel" aria-label={label}>
          {children}
          <menu className="page-filter-options" aria-label={label}>
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={value === option.value}
                  className={value === option.value ? "active" : ""}
                  onClick={() => select(option.value)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </menu>
        </div>
      )}
    </div>
  );
}
