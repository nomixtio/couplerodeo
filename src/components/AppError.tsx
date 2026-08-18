import { useEffect, useState } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import {
  isStaleAssetError,
  recoverFromStaleAssets,
  refreshAppToLatest,
} from "../lib/app-update";

export function AppError({ error }: ErrorComponentProps) {
  const stale = isStaleAssetError(error);
  const [refreshing, setRefreshing] = useState(stale);

  useEffect(() => {
    if (!stale) return;
    if (!recoverFromStaleAssets()) {
      setRefreshing(false);
    }
  }, [stale]);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshAppToLatest();
  }

  return (
    <div className="page">
      <section className="card">
        <h1>{stale ? "App update needed" : "Something went wrong"}</h1>
        <p className="hint">
          {stale
            ? "A newer version is available. Refresh to load it."
            : error.message}
        </p>
        <button
          type="button"
          className="btn primary"
          onClick={() => handleRefresh().catch(console.error)}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh app"}
        </button>
      </section>
    </div>
  );
}
