import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const versionPath = join(root, "src", "app-version.json");

const data = JSON.parse(readFileSync(versionPath, "utf8"));
data.build = (data.build ?? 0) + 1;
writeFileSync(versionPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(`App build bumped to ${data.build}`);
