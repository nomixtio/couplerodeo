import { existsSync } from "node:fs";

const localConfig = "wrangler.local.jsonc";
process.stdout.write(existsSync(localConfig) ? localConfig : "wrangler.jsonc");
