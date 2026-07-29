# Couple Rodeo

A minimal app for couples — no chat, just structured prompts, life updates, and quick signals. Built for Cloudflare Workers with React, TanStack Router, Hono, D1, and PushForge web push.

## Stack

- **Frontend:** React + TanStack Router (SPA/PWA)
- **Backend:** Hono on Cloudflare Workers (`couplerodeo`)
- **Database:** Cloudflare D1 (`couplerodeo-db`)
- **Notifications:** [@pushforge/builder](https://github.com/draphy/pushforge)

## Connecting as a couple

Each partner gets a **personal code**. All pairing state lives in D1 — the browser only stores a session token (`couplerodeo-session-token` in `localStorage`).

1. **Partner 1** opens the app → **Create a couple** → gets a personal code
2. Share that code with partner 2 (visible in **Settings**)
3. **Partner 2** opens the app → **Join my partner** → enters partner 1's code
4. Both enable notifications from **Notifications** in the menu

### Reconnecting on a new device

Enter your **own personal code** via **Connect with my code** on the home screen. Each partner's code is shown in **Settings** while connected.

## Navigation

Use the burger menu (top right) when logged in:

- **Home** — send love, capacity check-in
- **Questions** — ask and answer (multiple choice or scale 1–5)
- **Updates** — share life updates; partner can react with a Giphy GIF
- **Notifications** — enable push alerts
- **Settings** — your code, disconnect

## Setup

```bash
npm install
npm run db:migrate:local
```

Copy `.dev.vars.example` to `.dev.vars` and fill in secrets (see below).

### VAPID keys (push notifications)

Generate keys once:

```bash
npx @pushforge/builder vapid
```

1. Copy the **public key** into `wrangler.jsonc` → `vars.VAPID_PUBLIC_KEY`
2. Copy the **private key (JWK JSON)** into `.dev.vars` as `VAPID_PRIVATE_KEY`

### Giphy (update GIF reactions)

Add `GIPHY_API_KEY` to `.dev.vars` (see [developers.giphy.com](https://developers.giphy.com/)).

## Development

```bash
npm run dev
```

The Worker API and React SPA run together via the Cloudflare Vite plugin.

Schema is a **single init migration** (`migrations/0001_init.sql`) — no incremental history. After pulling schema changes:

```bash
npm run db:migrate:local
```

Reset all data (keeps schema):

```bash
npm run db:reset:local    # local dev database
npm run db:reset:remote   # production database
```

Clear browser `localStorage` after a reset or deploy (session storage key changed) so devices do not use stale sessions.

## Deploy

Create a remote D1 database (first time or fresh start):

```bash
npx wrangler d1 create couplerodeo-db
```

Paste the `database_id` from the output into `wrangler.jsonc` (replace `REPLACE_AFTER_wrangler_d1_create`), then:

```bash
npm run db:migrate:remote
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put GIPHY_API_KEY
npm run deploy
```

The Worker deploys as **`couplerodeo`**. You can remove the old `loveapp` worker from the Cloudflare dashboard if it is no longer needed.

## iPhone PWA testing

Push notifications require **HTTPS** — deploy to Cloudflare before testing on iPhone.

1. Deploy the app (`npm run deploy`)
2. Partner 1 creates a couple and shares their code from Settings
3. On iPhone, open the deployed URL in **Safari** → **Add to Home Screen**
4. Open the installed PWA → join → enable notifications
5. Send a question or update from the other device; tap the push notification

**Requirements:** iOS **16.4+**, PWA installed to Home Screen, notifications enabled per device.

## Project structure

```
src/           React frontend (TanStack Router)
worker/        Hono API + D1 + PushForge
shared/        Shared constants (app slug, premade updates, capacity copy)
migrations/    D1 SQL (single 0001_init.sql)
public/        PWA manifest, service worker, icons
```

## API

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/couples/create` | Create a new couple |
| `POST` | `/api/couples/connect` | Join with partner's personal code |
| `POST` | `/api/session/logout` | End session |
| `GET` | `/api/me` | Couple info + capacity snapshots |
| `GET` | `/api/questions` | Question thread |
| `POST` | `/api/questions` | Send a question (choice or scale) |
| `POST` | `/api/questions/:id/answer` | Submit an answer |
| `GET` | `/api/updates` | Update thread |
| `POST` | `/api/updates` | Send an update |
| `POST` | `/api/updates/:id/respond` | React with a Giphy GIF URL |
| `GET` | `/api/giphy/search` | Search Giphy (proxied) |
| `POST` | `/api/love` | Send love + optional message |
| `POST` | `/api/capacity` | Share capacity check-in (0–100%) |
| `POST` | `/api/push/subscribe` | Save push subscription |
| `GET` | `/api/push/vapid-public-key` | VAPID public key |

Protected routes require the `X-Session-Token` header.
