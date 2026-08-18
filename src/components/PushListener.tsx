import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { APP_SLUG } from "../lib/app";
import { registerServiceWorker } from "../lib/push";
import { navigateFromPushUrl } from "../lib/questions-nav";

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
}

export const PUSH_EVENT = `${APP_SLUG}-push`;

export function PushListener() {
  const [toast, setToast] = useState<PushMessage | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    registerServiceWorker().catch(console.error);

    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== `${APP_SLUG}-push`) return;
      const payload = event.data.payload as PushMessage;
      setToast(payload);
      window.dispatchEvent(new CustomEvent(PUSH_EVENT, { detail: payload }));
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  function handleClick() {
    if (!toast) return;
    const url = toast.url ?? "/updates";
    setToast(null);
    navigateFromPushUrl(url, navigate);
  }

  return (
    <button type="button" className="push-toast" onClick={handleClick}>
      <strong>{toast.title}</strong>
      <span>{toast.body}</span>
    </button>
  );
}

export function usePushRefresh(onPush: () => void) {
  useEffect(() => {
    function handler() {
      onPush();
    }
    window.addEventListener(PUSH_EVENT, handler);
    return () => window.removeEventListener(PUSH_EVENT, handler);
  }, [onPush]);
}
