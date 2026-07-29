import { getSessionToken } from "./partner";

const VAPID_KEY_LENGTH = 65;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function decodeVapidPublicKey(publicKey: string): Uint8Array {
  if (!publicKey?.trim()) {
    throw new Error("VAPID public key is missing on the server.");
  }

  let decoded: Uint8Array;
  try {
    decoded = urlBase64ToUint8Array(publicKey.trim());
  } catch {
    throw new Error("VAPID public key is malformed.");
  }

  if (decoded.length !== VAPID_KEY_LENGTH) {
    throw new Error(
      `VAPID public key has invalid length (${decoded.length}, expected ${VAPID_KEY_LENGTH}).`,
    );
  }

  return decoded;
}

async function fetchVapidPublicKey(): Promise<string> {
  const response = await fetch("/api/push/vapid-public-key");
  if (!response.ok) {
    throw new Error(
      `Could not load VAPID key (HTTP ${response.status}). Server error — try again after redeploy.`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "Could not load VAPID key (invalid response). Server error — try again after redeploy.",
    );
  }

  const data = (await response.json()) as { publicKey?: string };
  if (!data.publicKey) {
    throw new Error("VAPID public key is missing on the server.");
  }

  return data.publicKey;
}

function subscriptionUsesKey(
  subscription: PushSubscription,
  applicationServerKey: Uint8Array,
): boolean {
  const existingKey = subscription.options.applicationServerKey;
  // Chrome often omits applicationServerKey on existing subscriptions — keep them.
  if (!existingKey) return true;

  const existing = new Uint8Array(existingKey as ArrayBuffer);
  if (existing.length !== applicationServerKey.length) return false;

  return existing.every((byte, index) => byte === applicationServerKey[index]);
}

async function subscribeWithRetry(
  registration: ServiceWorkerRegistration,
  applicationServerKey: Uint8Array,
  attempts = 3,
): Promise<PushSubscription> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });
    } catch (err) {
      lastError = err;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe().catch(() => {});
      }
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (i + 1)));
      }
    }
  }

  throw lastError;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("SW registration failed:", err);
    return null;
  }
}

export async function subscribeToPush(
  options?: { forceRefresh?: boolean },
): Promise<boolean> {
  if (!("Notification" in window) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  // Start permission request synchronously (required for Safari iOS user gesture).
  const permissionPromise = Notification.requestPermission();

  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error("Could not register service worker.");
  }

  const permission = await permissionPromise;
  if (permission !== "granted") {
    throw new Error("Notifications blocked. Enable them in Settings → Notifications.");
  }

  await navigator.serviceWorker.ready;

  const publicKey = await fetchVapidPublicKey();
  const applicationServerKey = decodeVapidPublicKey(publicKey);

  let subscription = await registration.pushManager.getSubscription();

  if (options?.forceRefresh && subscription) {
    await subscription.unsubscribe();
    subscription = null;
  }

  if (subscription && !subscriptionUsesKey(subscription, applicationServerKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }

  if (!subscription) {
    subscription = await subscribeWithRetry(registration, applicationServerKey);
  }

  const token = getSessionToken();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Session-Token": token } : {}),
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to save push subscription (HTTP ${res.status}). Server error — try again after redeploy.`,
    );
  }

  return true;
}

export async function resetPushNotifications(): Promise<void> {
  const token = getSessionToken();
  const res = await fetch("/api/push/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Session-Token": token } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Reset failed (${res.status})`);
  }

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  }
}

export async function sendTestPush(): Promise<{ sent: boolean; error?: string }> {
  const token = getSessionToken();
  const res = await fetch("/api/push/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Session-Token": token } : {}),
    },
  });
  const data = (await res.json()) as { sent: boolean; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Test push failed (${res.status})`);
  }
  return data;
}

export function isPushSupported(): boolean {
  return (
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  );
}

export async function getPushStatus(): Promise<{
  permission: NotificationPermission;
  subscribed: boolean;
}> {
  const permission =
    "Notification" in window ? Notification.permission : "denied";

  if (!isPushSupported()) {
    return { permission, subscribed: false };
  }

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration()) ??
      (await registerServiceWorker());
    if (!registration) {
      return { permission, subscribed: false };
    }

    const subscription = await registration.pushManager.getSubscription();
    return {
      permission,
      subscribed: permission === "granted" && subscription !== null,
    };
  } catch {
    return { permission, subscribed: false };
  }
}

export function isStandalonePwa(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isBrave(): boolean {
  return "brave" in navigator;
}

export function formatPushError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Failed to enable notifications.";
  }

  const message = err.message;

  if (message.includes("denied") || message.includes("blocked")) {
    return "Notifications blocked. Enable them in Settings → Notifications.";
  }

  if (message.includes("Server error") || message.includes("HTTP")) {
    return message;
  }

  if (
    message.includes("push service error") ||
    message.includes("AbortError") ||
    err.name === "AbortError"
  ) {
    if (isBrave()) {
      return "Push blocked by Brave. Go to brave://settings/privacy → Use Google services for push messaging, then retry.";
    }
    return "Push service unavailable. Clear site data for this page (browser settings), reload, and try again. If it persists, retry in Chrome or check that push messaging is not blocked.";
  }

  if (isIos() && !isStandalonePwa()) {
    return `${message} On iPhone, add the app to your Home Screen first (Share → Add to Home Screen), then try again.`;
  }

  return message;
}
