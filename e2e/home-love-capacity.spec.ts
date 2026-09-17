import { expect, test } from "@playwright/test";
import { createPairedCouple } from "./helpers";

test("send love shows confirmation", async ({ browser }) => {
  const { alice } = await createPairedCouple(browser, `L${Date.now() % 100000}`);
  await expect(alice.getByRole("button", { name: /Send love to/ })).toBeVisible();
  await alice.locator(".love-message-label input").fill("Miss you!");
  await alice.getByRole("button", { name: /Send love to/ }).click();
  await expect(alice.locator(".love-card .hint.success")).toContainText(/Love sent|Saved/);
  await alice.close();
});

test("share capacity updates feedback", async ({ browser }) => {
  const { alice } = await createPairedCouple(browser, `C${Date.now() % 100000}`);
  const slider = alice.locator("#capacity-slider");
  await expect(slider).toBeVisible();
  await slider.fill("80");
  await alice.getByRole("button", { name: /Share with/ }).click();
  await expect(alice.locator(".capacity-card .hint.success")).toContainText(/Capacity shared|Saved/);
  await alice.close();
});
