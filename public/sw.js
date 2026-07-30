self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch {
        data = {};
      }

      const notification = data.payload ?? data;
      const title = notification.title ?? "";
      const body = notification.body ?? "";

      const origin = self.location.origin;
      const icon = notification.icon?.startsWith("http")
        ? notification.icon
        : `${origin}${notification.icon ?? "/icons/icon-192.png"}`;
      const badge = notification.badge?.startsWith("http")
        ? notification.badge
        : `${origin}${notification.badge ?? "/icons/icon-192.png"}`;

      const payload = {
        title: title || body || "❤️",
        body: title ? body : "",
        url: notification.data?.url ?? data.data?.url ?? "/questions?tab=answers",
      };

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({ type: "couplerodeo-push", payload });
      }

      await self.registration.showNotification(payload.title, {
        body: payload.body || undefined,
        icon,
        badge,
        tag: notification.tag ?? data.tag ?? "couplerodeo-message",
        renotify: true,
        requireInteraction: false,
        data: notification.data ?? data.data,
      });
    })().catch((err) => {
      console.error("Push display failed:", err);
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/questions?tab=answers";
  const targetUrl = url.startsWith("http") ? url : `${self.location.origin}${url}`;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const refreshPayload = { type: "couplerodeo-push", payload: { url, title: "", body: "" } };

      for (const client of list) {
        client.postMessage(refreshPayload);
        if ("focus" in client && client.url.includes(self.location.origin)) {
          if ("navigate" in client) {
            return client.navigate(targetUrl).then(() => client.focus());
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
