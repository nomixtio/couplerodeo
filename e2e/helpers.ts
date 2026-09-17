import type { Browser, Page } from "@playwright/test";

const TOKEN_KEY = "couplerodeo-session-token";

export async function clearSession(page: Page) {
  await page.goto("/connect");
  await page.evaluate((key) => localStorage.removeItem(key), TOKEN_KEY);
}

export interface PairedContexts {
  codeA: string;
}

/** Alice creates a couple via UI and returns her personal code. */
export async function createCoupleViaUI(page: Page, name: string): Promise<string> {
  await clearSession(page);
  await page.goto("/connect");
  await page.getByRole("button", { name: "Create a couple" }).click();
  await page.getByPlaceholder("Name").fill(name);
  await page.getByRole("button", { name: "Create couple", exact: true }).click();
  // Lands on /pairing which shows the personal code.
  await page.waitForURL("**/pairing");
  const code = (await page.locator(".code-display code").first().textContent())?.trim();
  if (!code) throw new Error("pairing code not found");
  return code;
}

/** Bob joins via UI using Alice's code. */
export async function joinCoupleViaUI(page: Page, code: string, name: string) {
  await clearSession(page);
  await page.goto("/connect");
  await page.getByRole("button", { name: "Enter partner's code" }).click();
  await page.getByPlaceholder("Only needed the first time you join").fill(name);
  await page.getByPlaceholder("Your partner's code").fill(code);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.waitForURL("**/settings");
}

/** Create Alice + Bob in two isolated contexts and return their pages. */
export async function createPairedCouple(browser: Browser, suffix: string) {
  const alice = await (await browser.newContext()).newPage();
  const bob = await (await browser.newContext()).newPage();
  const codeA = await createCoupleViaUI(alice, `Alice${suffix}`);
  await joinCoupleViaUI(bob, codeA, `Bob${suffix}`);
  // Alice is still on /pairing (waiting). Move her home now that Bob joined.
  await alice.goto("/");
  await alice.waitForURL("**/");
  return { alice, bob, codeA };
}
