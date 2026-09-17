import { expect, test } from "@playwright/test";
import { createPairedCouple } from "./helpers";

test("all main routes load for a paired couple", async ({ browser }) => {
  const { alice } = await createPairedCouple(browser, `R${Date.now() % 100000}`);
  for (const route of ["/", "/updates", "/calendar", "/notes", "/plans", "/settings"]) {
    await alice.goto(route);
    // No hard crash: the route renders its page container.
    await expect(alice.locator(".page").first()).toBeVisible({ timeout: 15_000 });
  }
  await alice.close();
});

test("unauthenticated user is sent to connect", async ({ page }) => {
  await page.goto("/connect");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await expect(page).toHaveURL(/\/connect/);
});

test("meta endpoint reports a build number", async ({ browser }) => {
  const { alice } = await createPairedCouple(browser, `M${Date.now() % 100000}`);
  const res = await alice.request.get("/api/meta");
  expect(res.ok()).toBe(true);
  const json = (await res.json()) as { build: number };
  expect(typeof json.build).toBe("number");
  await alice.close();
});
