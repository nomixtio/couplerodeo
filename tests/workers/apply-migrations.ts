import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

declare module "cloudflare:workers" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: Array<{ name: string; queries: string[] }>;
    VAPID_PUBLIC_KEY: string;
    VAPID_PRIVATE_KEY: string;
    GIPHY_API_KEY: string;
  }
}

// Setup files run outside per-test-file storage isolation. applyD1Migrations
// only applies pending migrations, so calling it here is safe.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
