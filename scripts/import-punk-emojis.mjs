import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PAGE_ID = "af924324-0cf7-41c8-ada2-4b0c7043f632";
const NOTION_URL = "https://pentagonal-paperback-a2c.notion.site/api/v3/loadCachedPageChunk";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/emojis/punk");
const catalogPath = join(root, "shared/punk-emojis.json");

function innerBlock(rec) {
  const value = rec?.value;
  if (
    value &&
    typeof value === "object" &&
    value.value &&
    typeof value.value === "object" &&
    "type" in value.value
  ) {
    return value.value;
  }
  return value ?? {};
}

function flattenRichText(rich) {
  if (!rich) return "";
  if (typeof rich === "string") return rich;
  if (!Array.isArray(rich)) return "";
  return rich
    .map((part) => (Array.isArray(part) && part.length ? String(part[0]) : String(part)))
    .join("");
}

function extractSvg(source) {
  const start = source.indexOf("<svg");
  const end = source.lastIndexOf("</svg>");
  if (start === -1 || end === -1) return null;
  return source.slice(start, end + "</svg>".length).trim();
}

function pad(n) {
  return String(n).padStart(2, "0");
}

const response = await fetch(NOTION_URL, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    page: { id: PAGE_ID },
    limit: 200,
    cursor: { stack: [] },
    chunkNumber: 0,
    verticalColumns: false,
  }),
});

if (!response.ok) {
  throw new Error(`Notion fetch failed: ${response.status}`);
}

const payload = await response.json();
const blocks = payload?.recordMap?.block ?? {};
const page = innerBlock(blocks[PAGE_ID]);
const order = page.content ?? [];

const svgs = [];
for (const blockId of order) {
  const rec = blocks[blockId];
  if (!rec) continue;
  const value = innerBlock(rec);
  if (value.type !== "code") continue;
  const svg = extractSvg(flattenRichText(value.properties?.title));
  if (svg) svgs.push(svg);
}

if (svgs.length === 0) {
  throw new Error("No SVG code blocks found on the Notion page");
}

mkdirSync(outDir, { recursive: true });

const catalog = [];
svgs.forEach((svg, index) => {
  const n = index + 1;
  const id = `PUNK-${pad(n)}`;
  const file = `punk-${pad(n)}.svg`;
  const labeled = svg.replace(/id="liggma"/i, `id="${id.toLowerCase()}"`);
  writeFileSync(join(outDir, file), `${labeled}\n`);
  catalog.push({
    id,
    file,
    annotation: `Punk ${pad(n)}`,
    tags: "punk, remix",
  });
});

writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`wrote ${svgs.length} SVGs to ${outDir}`);
console.log(`wrote ${catalogPath}`);
