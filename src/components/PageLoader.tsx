import { APP_ICON } from "../lib/app";

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = "Loading" }: PageLoaderProps) {
  return (
    <div
      className="page-loader"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <img
        src={APP_ICON}
        alt=""
        className="page-loader-icon"
        width={72}
        height={72}
      />
    </div>
  );
}
