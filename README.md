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
- **Calendar** — shared events with optional reminders
- **Notes** — simple notes and shared todo lists
- **Location** — optional location sharing on a map
- **Notifications** — enable push alerts
- **Settings** — your code, disconnect

## Forking / self-hosting

You need your own:

- [Cloudflare](https://dash.cloudflare.com/) account (Workers + D1)
- VAPID key pair for web push (generate below)
- Free [Giphy API key](https://developers.giphy.com/) for GIF search

Clone the repo, follow **Setup** and **Deploy**, and replace the placeholders in `wrangler.jsonc` with your own `database_id` and `VAPID_PUBLIC_KEY`.

**Optional:** copy `wrangler.jsonc` to `wrangler.local.jsonc` (gitignored) with your production values. Remote deploy and migration scripts automatically use `wrangler.local.jsonc` when it exists.

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

Schema migrations live in `migrations/` (applied in order). After pulling schema changes:

```bash
npm run db:migrate:local
```

Reset all data (keeps schema):

```bash
npm run db:reset:local    # local dev database
npm run db:reset:remote   # remote/production database — DESTRUCTIVE
```

**Warning:** `db:reset:remote` wipes all data in your remote D1 database. Only run it if you intend to erase production data. Never point it at the staging database while previews are active — previews share the staging D1.

Clear browser `localStorage` after a reset or deploy (session storage key changed) so devices do not use stale sessions.

## Deploy

Manual Wrangler deploys still work and remain the fallback until the first Alchemy production deploy succeeds (see Environments below).

Create a remote D1 database (first time or fresh start):

```bash
npx wrangler d1 create couplerodeo-db
```

Paste the `database_id` from the output into `wrangler.jsonc` (replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`), set `vars.VAPID_PUBLIC_KEY`, then:

```bash
npm run db:migrate:remote
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put GIPHY_API_KEY
npm run deploy
```

The Worker deploys as **`couplerodeo`**.

## Environments (Alchemy)

Cloudflare environments are defined in [`alchemy.run.ts`](alchemy.run.ts) and deployed automatically. State is shared via the account-level `alchemy-state-store` Worker (also used by other projects — reused, never duplicated).

| Stage | Source | Lifecycle |
|-------|--------|-----------|
| `production` | `main`, manual (`Production` workflow) | Long-lived, adopts the existing Worker + D1 |
| `staging` | `staging` branch, auto on push | Long-lived, own Worker + D1 + website |
| `pr-<n>` | pull request, auto | Ephemeral, **shares the staging D1**, URLs posted on the PR, destroyed on close |
| `br-<slug>` | any other branch push, auto | Ephemeral, **shares the staging D1**, destroyed on branch delete |

`main` is prod-only: pushes to `main` never deploy anywhere else, and only the manual `Production` workflow deploys `production`. Previews never run the 5-minute cron (no duplicate push notifications) — cron runs on `production` and `staging` only. Both the app (`couplerodeo`) and the marketing site (`couplerodeo-web`) deploy on every stage.

Previews share the staging D1 (no data isolation between concurrent previews). Do not run destructive commands or load tests against a preview, and do not reset the staging database while previews are active. Uploaded Images/Stream media from previews also persist account-wide — preview destroy removes Workers only.

Local commands (requires `npx alchemy profile edit --add Cloudflare` once):

```bash
npm run build                        # always build first — deploys serve dist/client
npm run deploy:staging               # build + deploy the staging stage
npm run deploy:production            # build + deploy production (manual only)
npx alchemy plan --stage pr-42       # preview changes without applying
npx alchemy destroy --stage br-x --yes
```

Deploy order matters: push the `staging` branch (or run `deploy:staging`) at least once before any preview — previews resolve the staging D1 from staging's state.

First production deploy must adopt the Wrangler-managed resources (run once, or pass `true` to the `adopt` input of the `Production` workflow):

```bash
npx alchemy deploy --stage production --adopt
```

Required GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` (Workers Scripts/D1/Secrets Store write), `CLOUDFLARE_ACCOUNT_ID`, `ALCHEMY_PASSWORD` (state encryption), `VAPID_PRIVATE_KEY`, `GIPHY_API_KEY`. Optional: `VAPID_PUBLIC_KEY` (defaults to the shared public key in `alchemy.run.ts` — a single VAPID pair is shared by all stages by design).

Local dev is unchanged: `npm run dev`, unit/worker/e2e tests, and `wrangler.*.jsonc` configs never touch Alchemy or the Cloudflare API.

## Marketing site

The public landing page lives in [`website/`](website/) and deploys as a **separate** Worker (`couplerodeo-web`). It points visitors to GitHub / self-hosting only — there is no link to a hosted app instance.

```bash
npm run dev:website      # local preview
npm run deploy:website   # deploy marketing Worker
```

Attach a custom domain in the Cloudflare dashboard under the `couplerodeo-web` Worker (Custom Domains). Keep the app Worker on `*.workers.dev` (or its own domain) separately.

When deploying via Alchemy (see Environments above), the site is included automatically on every stage — `deploy:website` remains for manual Wrangler use only.

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
website/       Marketing site (separate Worker, custom domain)
shared/        Shared constants (app slug, premade updates, capacity copy)
migrations/    D1 SQL migrations (0001–0004)
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
| `GET` | `/api/calendar/events` | List calendar events |
| `GET` | `/api/calendar/events/upcoming` | Upcoming events |
| `POST` | `/api/calendar/events` | Create calendar event |
| `PATCH` | `/api/calendar/events/:id` | Update calendar event |
| `DELETE` | `/api/calendar/events/:id` | Delete calendar event |
| `GET` | `/api/notes` | List notes and todos |
| `POST` | `/api/notes` | Create note or todo |
| `PATCH` | `/api/notes/:id` | Update note or todo |
| `DELETE` | `/api/notes/:id` | Delete note |
| `GET` | `/api/location/shares/latest` | Latest location shares |
| `POST` | `/api/location/shares` | Share current location |
| `DELETE` | `/api/location/shares/mine` | Remove your location share |
| `POST` | `/api/push/subscribe` | Save push subscription |
| `GET` | `/api/push/vapid-public-key` | VAPID public key |

Protected routes require the `X-Session-Token` header.

## License

MIT — see [LICENSE](LICENSE).
