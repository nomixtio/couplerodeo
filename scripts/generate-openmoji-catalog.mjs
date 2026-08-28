import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OPENMOJI_VERSION = "16.0.0";
const SOURCE_URL = `https://cdn.jsdelivr.net/npm/openmoji@${OPENMOJI_VERSION}/data/openmoji.json`;

const KEEP_GROUPS = new Set([
  "smileys-emotion",
  "people-body",
  "animals-nature",
  "food-drink",
  "travel-places",
  "activities",
  "objects",
  "symbols",
  "extras-openmoji",
]);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "shared/openmoji-catalog.json");

function hasSkintone(entry) {
  const tone = entry.skintone;
  if (tone === "" || tone == null || tone === false) return false;
  return true;
}

function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.openmojis)) return data.openmojis;
  throw new Error("Unexpected OpenMoji JSON shape");
}

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`Failed to fetch OpenMoji data: ${response.status}`);
}

const emojis = asList(await response.json())
  .filter((entry) => KEEP_GROUPS.has(entry.group) && !hasSkintone(entry))
  .map((entry) => {
    const tags = [entry.tags, entry.openmoji_tags]
      .filter((value) => typeof value === "string" && value.trim())
      .join(", ");
    return {
      hexcode: String(entry.hexcode).trim().toUpperCase(),
      annotation: String(entry.annotation ?? "").trim(),
      group: String(entry.group),
      tags,
    };
  })
  .filter((entry) => /^[0-9A-F]+(?:-[0-9A-F]+)*$/.test(entry.hexcode));

const unique = [];
const seen = new Set();
for (const emoji of emojis) {
  if (seen.has(emoji.hexcode)) continue;
  seen.add(emoji.hexcode);
  unique.push(emoji);
}

writeFileSync(
  outPath,
  `${JSON.stringify({ version: OPENMOJI_VERSION, emojis: unique }, null, 2)}\n`,
);
console.log(`wrote ${outPath} (${unique.length} emojis, OpenMoji ${OPENMOJI_VERSION})`);
