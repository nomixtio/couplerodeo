# Couple Rodeo

A minimal question-and-answer app for couples — no chat, just structured prompts and replies. Built for Cloudflare Workers with React, TanStack Router, Hono, D1, and PushForge web push.

## Stack

- **Frontend:** React + TanStack Router (SPA/PWA)
- **Backend:** Hono on Cloudflare Workers
- **Database:** Cloudflare D1
- **Notifications:** [@pushforge/builder](https://github.com/draphy/pushforge)

## Connecting as a couple

Each partner gets a **personal code**. All pairing state lives in D1 — the browser only stores a session token.

1. **Partner 1** opens the app → **Create a couple** → gets a personal code
2. Share that code with partner 2 (visible in **Settings**)
3. **Partner 2** opens the app → **Join my partner** → enters partner 1's code
4. Both enable notifications from **Settings** and use **Questions** from the menu

### Reconnecting on a new device

Enter your **own personal code** via **Connect with my code** on the home screen. Each partner's code is shown in **Settings** while connected.

## Navigation

Use the burger menu (top right) when logged in:

- **Questions** — send and view questions
- **Settings** — your code, notifications, disconnect

## Question types

- **Multiple choice** — custom options
- **Scale 1–5** — numeric rating
- **GIF reaction** — pick from a curated GIF list

## Setup

```bash
npm install
npm run db:migrate:local
```

### VAPID keys (push notifications)

Generate keys once:

```bash
npx @pushforge/builder vapid
```

1. Copy the **public key** into `wrangler.jsonc` → `vars.VAPID_PUBLIC_KEY`
2. Copy the **private key (JWK JSON)** into `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars and paste your private key on one line
```

For production, set the secret:

```bash
npx wrangler secret put VAPID_PRIVATE_KEY
# Paste the JWK JSON when prompted
```

## Development

```bash
npm run dev
```

Open the URL shown in the terminal. The Worker API and React SPA run together via the Cloudflare Vite plugin.

Apply migrations locally after schema changes:

```bash
npm run db:migrate:local
```

Reset all data (keeps schema; clears couples, partners, sessions, questions, answers):

```bash
npm run db:reset:local    # local dev database
npm run db:reset:remote   # production database
```

Clear browser `localStorage` (session token) after a reset so the app does not use stale sessions.

## Deploy

Create a remote D1 database (first time only):

```bash
npx wrangler d1 create loveapp-db
```

Update `database_id` in `wrangler.jsonc` with the ID from the command output, then:

```bash
npm run db:migrate:remote
npx wrangler secret put VAPID_PRIVATE_KEY
npm run deploy
```

## iPhone PWA testing

Push notifications require **HTTPS** — deploy to Cloudflare before testing on iPhone.

1. Deploy the app (`npm run deploy`)
2. Partner 1 creates a couple on desktop and shares their code from Settings
3. On iPhone, open the deployed URL in **Safari**
4. Tap **Share → Add to Home Screen**
5. Open the installed PWA → **Join my partner** → enable notifications in Settings
6. Partner 1 sends a question from Questions
7. Partner 2 should receive a push; tap it to answer

**Requirements:**

- iOS **16.4+** for web push
- PWA must be installed to Home Screen
- Each device needs notifications enabled separately

## Project structure

```
src/           React frontend (TanStack Router)
worker/        Hono API + D1 + PushForge
migrations/    D1 SQL migrations
public/        PWA manifest, service worker, icons
```

## API

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/couples/create` | Create a new couple |
| `POST` | `/api/couples/connect` | Join (`intent: join`) or reconnect (`intent: reconnect`) with a code |
| `POST` | `/api/session/logout` | End session |
| `GET` | `/api/me` | Couple info (requires session) |
| `GET` | `/api/questions` | Question thread |
| `POST` | `/api/questions` | Send a question |
| `POST` | `/api/questions/:id/answer` | Submit an answer |
| `POST` | `/api/push/subscribe` | Save push subscription |
| `GET` | `/api/push/vapid-public-key` | VAPID public key |

Protected routes require the `X-Session-Token` header.
