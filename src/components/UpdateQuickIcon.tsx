import type { QuickUpdateIcon } from "../../shared/updates";

export function UpdateQuickIcon({ icon }: { icon: QuickUpdateIcon }) {
  switch (icon) {
    case "five":
      return <span className="update-quick-glyph-text">5</span>;
    case "ten":
      return <span className="update-quick-glyph-text">10</span>;
    case "thirty":
      return <span className="update-quick-glyph-text">30</span>;
    case "store":
      return <span className="update-quick-glyph-text">$</span>;
    case "elevator":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect
            x="6"
            y="3"
            width="12"
            height="18"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M9 6v12M15 6v12"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M12 7.5V9M11 8.25h2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12 16.5V15M11 15.75h2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="0.9" fill="currentColor" />
        </svg>
      );
    case "cab":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 16h16l-1.8-5.2a2.2 2.2 0 0 0-2.1-1.5H7.9a2.2 2.2 0 0 0-2.1 1.5L4 16Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M4 16h16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <rect
            x="9.5"
            y="6.5"
            width="5"
            height="2.5"
            rx="0.5"
            fill="currentColor"
          />
          <circle cx="7.5" cy="16" r="1.35" fill="currentColor" />
          <circle cx="16.5" cy="16" r="1.35" fill="currentColor" />
        </svg>
      );
    case "home":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4.5 10.5 12 4.5 19.5 10.5V19a1 1 0 0 1-1 1h-4.5v-5.5H10V20H5.5a1 1 0 0 1-1-1v-8.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "office":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect
            x="5"
            y="4"
            width="14"
            height="17"
            rx="1.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M9 8h1.5M13.5 8H15M9 12h1.5M13.5 12H15M9 16h1.5M13.5 16H15"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M12 4V2.5M9.5 2.5h5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "late":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="15"
            cy="5.5"
            r="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M15 7.5 12.5 11.5 14 13.5 10.5 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 9.5 17 12l-1 3 4 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}
