import type { QuickUpdateIcon } from "../../shared/updates";

export function UpdateQuickIcon({ icon }: { icon: QuickUpdateIcon }) {
  switch (icon) {
    case "five":
      return <span className="update-quick-glyph-text">5</span>;
    case "ten":
      return <span className="update-quick-glyph-text">10</span>;
    case "thirty":
      return <span className="update-quick-glyph-text">30</span>;
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
            d="M3 16h1.2l1.4-4.6A2 2 0 0 1 7.5 10h9a2 2 0 0 1 1.9 1.4L19.8 16H21"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 16h14"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <rect
            x="10"
            y="6.5"
            width="4"
            height="2.2"
            rx="0.5"
            fill="currentColor"
          />
          <circle cx="7.5" cy="16.5" r="1.5" fill="currentColor" />
          <circle cx="16.5" cy="16.5" r="1.5" fill="currentColor" />
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
            x="4"
            y="14"
            width="16"
            height="3"
            rx="0.75"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M12 14V9"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <rect
            x="8.5"
            y="5"
            width="7"
            height="5"
            rx="0.75"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M8.5 7.5h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
