import { expect, test } from "@playwright/test";
import { createPairedCouple } from "./helpers";

test("send a text update and see it in the feed", async ({ browser }) => {
  const { alice, bob } = await createPairedCouple(browser, `U${Date.now() % 100000}`);
  const message = `hello e2e ${Date.now()}`;

  await alice.goto("/updates");
  await alice.getByLabel("Type an update").click();
  await alice.getByPlaceholder("Type an update…").fill(message);
  await alice.getByRole("button", { name: "Send update" }).click();
  await expect(alice.getByLabel("Updates feed")).toContainText(message);

  // Partner sees it too.
  await bob.goto("/updates");
  await expect(bob.getByLabel("Updates feed")).toContainText(message);
  await alice.close();
  await bob.close();
});

test("ask a choice question", async ({ browser }) => {
  const { alice } = await createPairedCouple(browser, `Q${Date.now() % 100000}`);
  const text = `Dinner? ${Date.now()}`;
  await alice.goto("/updates");
  await alice.getByLabel("Ask a question").click();
  await alice.getByPlaceholder("Did you get the milk?").fill(text);
  await alice.getByRole("button", { name: "Send question" }).click();
  await expect(alice.getByLabel("Updates feed")).toContainText(text);
  await alice.close();
});
