// Seeds a paired couple + a few updates against a running dev server so the
// Updates page (incl. the bottom drawer) can be eyeballed manually.
//
// Usage:
//   1. WRANGLER_CONFIG=wrangler.e2e.jsonc npm run dev
//   2. node scripts/seed-visual-couple.mjs   (add BASE_URL=... to override)
//   3. Paste the printed localStorage snippet in the browser console, reload,
//      and open /updates. Use an incognito window for the Bob snippet.

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const TOKEN_KEY = "couplerodeo-session-token";

async function call(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Session-Token": token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

const created = await call("/api/couples/create", {
  method: "POST",
  body: { name: "Alice" },
});
const tokenA = created.sessionToken;
const meA = await call("/api/me", { token: tokenA });
const joined = await call("/api/couples/connect", {
  method: "POST",
  body: { code: meA.myCode, name: "Bob" },
});
const tokenB = joined.sessionToken;

const seedTexts = [
  [tokenA, "On my way home!"],
  [tokenB, "Running late, stuck in traffic"],
  [tokenA, "Grabbing groceries first"],
  [tokenB, "In the elevator"],
  [tokenA, "Will be there in 10"],
  [tokenB, "At the store, need anything?"],
  [tokenA, "Just arrived"],
];
for (const [token, text] of seedTexts) {
  await call("/api/updates", { method: "POST", token, body: { text } });
}
await call("/api/updates", {
  method: "POST",
  token: tokenB,
  body: { kind: "question", type: "choice", text: "Pizza or pasta?", options: ["Pizza", "Pasta"] },
});

console.log(`Seeded 1 couple + ${seedTexts.length + 1} updates on ${BASE}\n`);
console.log("Alice (normal window console, then open /updates):");
console.log(`  localStorage.setItem(${JSON.stringify(TOKEN_KEY)}, ${JSON.stringify(tokenA)})`);
console.log("Bob (incognito window console, then open /updates):");
console.log(`  localStorage.setItem(${JSON.stringify(TOKEN_KEY)}, ${JSON.stringify(tokenB)})`);
