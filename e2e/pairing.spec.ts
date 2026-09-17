import { expect, test } from "@playwright/test";
import { createCoupleViaUI, joinCoupleViaUI } from "./helpers";

test("create a couple shows a personal code", async ({ page }) => {
  const code = await createCoupleViaUI(page, `Alice${Date.now()}`);
  expect(code.length).toBeGreaterThan(3);
  await expect(page.locator(".code-display code")).toContainText(code);
});

test("join with a partner code lands on settings", async ({ browser }) => {
  const suffix = `${Date.now()}`;
  const alice = await (await browser.newContext()).newPage();
  const bob = await (await browser.newContext()).newPage();
  const code = await createCoupleViaUI(alice, `Alice${suffix}`);
  await joinCoupleViaUI(bob, code, `Bob${suffix}`);
  await expect(bob).toHaveURL(/\/settings/);
  await alice.close();
  await bob.close();
});

test("join with an invalid code shows an error", async ({ page }) => {
  await page.goto("/connect");
  await page.getByRole("button", { name: "Enter partner's code" }).click();
  await page.getByPlaceholder("Only needed the first time you join").fill("Mallory");
  await page.getByPlaceholder("Your partner's code").fill("INVALID00");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.locator(".hint.error")).toBeVisible();
});

test("session persists across reloads", async ({ page }) => {
  await createCoupleViaUI(page, `Alice${Date.now()}`);
  await page.goto("/pairing");
  await page.reload();
  await expect(page).toHaveURL(/\/pairing/);
});
