// alchemy.run.ts — Cloudflare environments as code.
//
// Stages:
//   production  manual deploys from `main` (adopts the existing Worker + D1)
//   staging     auto-deploys from the `staging` branch (long-lived, own D1)
//   pr-<n>      ephemeral PR previews, SHARE the staging D1, destroyed on PR close
//   br-<slug>   ephemeral branch previews, SHARE the staging D1, destroyed on branch delete
//
// Preview stages deliberately do NOT own a D1Database resource: they bind the
// staging database via `Database.ref("db", { stage: "staging" })`. A ref is
// read-only state — `alchemy destroy --stage pr-N` deletes the preview
// Workers but can never delete the shared staging database. Deploy `staging`
// at least once before any preview (the ref resolves from staging's state).
//
// Local usage (requires `alchemy profile edit --add Cloudflare` once):
//   npm run build
//   npx alchemy plan --stage staging
//   npx alchemy deploy --stage staging
//   npx alchemy destroy --stage br-my-feature --yes
//
// First production deploy adopts the Wrangler-managed resources:
//   npx alchemy deploy --stage production --adopt
//
// NOTE: alchemy@2.0.0-beta.77 requires effect@4.0.0-rc.112 (lowercase
// `Config.*` API). Newer effect RCs renamed it (`Config.String`) and break
// the alchemy CLI itself. Re-check when upgrading alchemy.
//
// Required env (see README "Environments"):
//   VAPID_PRIVATE_KEY, GIPHY_API_KEY (secrets, single shared pair for all stages)
// Optional env (sane default for previews):
//   VAPID_PUBLIC_KEY (default shared public key below)
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Stack } from "alchemy/Stack";
import * as GitHub from "alchemy/GitHub";
import * as Output from "alchemy/Output";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

const COMPATIBILITY_DATE = "2026-07-01";

// Physical names for the long-lived stages. Preview stages use
// Alchemy-generated names so they can never collide.
const PROD_WORKER_NAME = "couplerodeo";
const PROD_DB_NAME = "couplerodeo-db";
const PROD_WEB_NAME = "couplerodeo-web";
const STAGING_WORKER_NAME = "couplerodeo-staging";
const STAGING_DB_NAME = "couplerodeo-db-staging";
const STAGING_WEB_NAME = "couplerodeo-web-staging";

// Single shared VAPID pair for all stages (per project decision).
// The public key is safe to default (it already ships in the client bundle
// and is served at /api/push/vapid-public-key). Override with VAPID_PUBLIC_KEY.
const DEFAULT_VAPID_PUBLIC_KEY =
	"BDrJPaDwXUWO3f_wR1K35iMVyKReck3P6bP1hdlKREEr9C8_to0K6oYnPWf7D2VfuDHUx4g3JOFe7_jBh8IL7TY";

export default Alchemy.Stack(
	"couplerodeo",
	{
		providers: Layer.mergeAll(GitHub.providers(), Cloudflare.providers()),
		// Shared account-level state store (`alchemy-state-store` Worker,
		// also used by learn-hungarian). Reused automatically — no bootstrap.
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const stack = yield* Stack;
		const stage = stack.stage;

		const isProduction = stage === "production";
		const isStaging = stage === "staging";
		const isPreview = !isProduction && !isStaging;

		// Cron reminders send real push notifications — never on previews
		// (they share the staging DB; N preview crons would spam duplicates).
		const crons = isPreview ? [] : ["*/5 * * * *"];

		// Long-lived stages own their D1 (migrations auto-applied).
		// Previews bind the staging DB by ref — never owned, never destroyed.
		const db = isPreview
			? yield* Cloudflare.D1.Database.ref("db", { stage: "staging" })
			: yield* Cloudflare.D1.Database("db", {
					...(isProduction ? { name: PROD_DB_NAME } : { name: STAGING_DB_NAME }),
					migrations: "./migrations",
				});

		const app = yield* Cloudflare.Worker("app", {
			...(isProduction
				? { name: PROD_WORKER_NAME }
				: isStaging
					? { name: STAGING_WORKER_NAME }
					: {}),
			main: "./worker/index.ts",
			// nodejs_compat is appended automatically; matches wrangler.jsonc.
			compatibility: { date: COMPATIBILITY_DATE },
			assets: {
				directory: "./dist/client",
				notFoundHandling: "single-page-application",
				// /assets/* must hit the Worker (stale-asset reload handler).
				runWorkerFirst: ["/api/*", "/assets/*"],
			},
			crons,
			env: {
				DB: db,
				IMAGES: Cloudflare.Images.Images("IMAGES"),
				STREAM: Cloudflare.Stream.Stream("STREAM"),
				// Empty string (unset GitHub var) must fall back too — `??` alone would keep "".
				VAPID_PUBLIC_KEY:
					process.env.VAPID_PUBLIC_KEY?.trim() || DEFAULT_VAPID_PUBLIC_KEY,
				VAPID_PRIVATE_KEY: Config.redacted("VAPID_PRIVATE_KEY"),
				GIPHY_API_KEY: Config.redacted("GIPHY_API_KEY"),
			},
		});

		const web = yield* Cloudflare.Worker("web", {
			...(isProduction
				? { name: PROD_WEB_NAME }
				: isStaging
					? { name: STAGING_WEB_NAME }
					: {}),
			assets: {
				directory: "./website/public",
				notFoundHandling: "404-page",
			},
		});

		// PR previews get an auto-updating comment with the preview URLs.
		// Skipped for local/manual deploys (no PR context).
		const github = yield* GitHub.GitHubEnv;
		if (github?.pr) {
			yield* GitHub.Comment("preview-comment", {
				owner: github.owner,
				repository: github.repository,
				issueNumber: github.pr,
				body: Output.interpolate`
					## Preview deployed (${stage})

					**App:** ${app.url}
					**Site:** ${web.url}

					Built from commit ${github.sha.slice(0, 7)}. Shares the staging D1
					database (no data isolation between previews). Cron reminders are
					disabled on previews.

					---
					_This comment updates automatically with each push. Destroyed on PR close._
				`,
			});
		}

		return { url: app.url, webUrl: web.url, stage };
	}),
);
