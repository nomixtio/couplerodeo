import { expect, test } from "@playwright/test";
import { createPairedCouple } from "./helpers";

test("add a quick update with a stacked icon picker", async ({ browser }) => {
  const { alice, bob } = await createPairedCouple(browser, `S${Date.now() % 100000}`);
  const text = `e2e quick ${Date.now() % 100000}`;

  await alice.goto("/settings/quick-updates");
  await alice.getByRole("button", { name: "Add quick update" }).click();
  await alice.getByLabel("Text").fill(text);
  await alice.getByRole("button", { name: "Choose icon" }).click();
  await expect(
    alice.getByRole("dialog", { name: "Choose an icon" }),
  ).toBeVisible();
  await alice.getByRole("option").first().click();
  await expect(
    alice.getByRole("dialog", { name: "New quick update" }),
  ).toBeVisible();
  await alice.getByRole("button", { name: "Save", exact: true }).click();
  await expect(alice.getByText(text)).toBeVisible();
  await alice.close();
  await bob.close();
});
