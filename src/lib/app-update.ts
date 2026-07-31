import { APP_BUILD } from "./app";
import { fetchAppMeta } from "./api";

export type AppUpdateStatus =
  | { kind: "upToDate"; localBuild: number; serverBuild: number }
  | { kind: "updateAvailable"; localBuild: number; serverBuild: number }
  | { kind: "error"; message: string };

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
