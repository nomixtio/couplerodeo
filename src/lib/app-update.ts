import { APP_BUILD, APP_SLUG } from "./app";
import { fetchAppMeta } from "./api";

const DISMISSED_UPDATE_KEY = `${APP_SLUG}-dismissed-update-build`;

export type AppUpdateStatus =
  | { kind: "upToDate"; localBuild: number; serverBuild: number }
  | { kind: "updateAvailable"; localBuild: number; serverBuild: number }
  | { kind: "error"; message: string };

export function getDismissedUpdateBuild(): number | null {
  try {
    const raw = sessionStorage.getItem(DISMISSED_UPDATE_KEY);
    if (!raw) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function dismissUpdatePrompt(serverBuild: number): void {
  try {
    sessionStorage.setItem(DISMISSED_UPDATE_KEY, String(serverBuild));
  } catch {
    // Ignore storage errors.
  }
}

export async function checkForAppUpdate(): Promise<AppUpdateStatus> {
  try {
    const meta = await fetchAppMeta();
    const serverBuild = meta.build;
    if (serverBuild > APP_BUILD) {
      return { kind: "updateAvailable", localBuild: APP_BUILD, serverBuild };
    }
    return { kind: "upToDate", localBuild: APP_BUILD, serverBuild };
  } catch (err) {
    return {
      kind: "error",
      message:
        err instanceof Error ? err.message : "Could not check for updates",
    };
  }
}

export async function refreshAppToLatest(): Promise<void> {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      }
    } catch {
      // Continue with cache clear + reload even if SW update fails.
    }
  }

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      // Continue with reload even if cache clear fails.
    }
  }

  window.location.replace(`/?v=${Date.now()}`);
}
