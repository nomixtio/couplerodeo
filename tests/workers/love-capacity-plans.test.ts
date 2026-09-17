import { describe, expect, it } from "vitest";
import { api, createPairedCouple } from "./helpers";

describe("love + capacity", () => {
  it("blocks love/capacity until the partner connects", async () => {
    const solo = await api<{ sessionToken: string }>("/api/couples/create", {
      method: "POST",
      body: { name: "Solo" },
    });
    const token = solo.data.sessionToken;
    const love = await api("/api/love", { method: "POST", token, body: {} });
    expect(love.status).toBe(400);
    const cap = await api("/api/capacity", { method: "POST", token, body: { level: 50 } });
    expect(cap.status).toBe(400);
  });

  it("sends love and shares capacity once paired", async () => {
    const f = await createPairedCouple();
    const love = await api<{ ok: boolean }>("/api/love", {
      method: "POST",
      token: f.tokenA,
      body: { message: "hi" },
    });
    expect(love.status).toBe(200);

    const badCap = await api("/api/capacity", {
      method: "POST",
      token: f.tokenA,
      body: { level: 101 },
    });
    expect(badCap.status).toBe(400);

    const cap = await api<{ ok: boolean }>("/api/capacity", {
      method: "POST",
      token: f.tokenA,
      body: { level: 80 },
    });
    expect(cap.status).toBe(200);
  });
});

describe("unread counts", () => {
  it("tracks updates and clears on mark-seen", async () => {
    const f = await createPairedCouple();
    await api("/api/updates", {
      method: "POST",
      token: f.tokenA,
      body: { text: "something new" },
    });

    const before = await api<{ updates: number; total: number }>("/api/unread-counts", {
      token: f.tokenB,
    });
    expect(before.status).toBe(200);
    expect(before.data.updates).toBeGreaterThanOrEqual(1);

    const seen = await api("/api/unread/mark-seen", {
      method: "POST",
      token: f.tokenB,
      body: { section: "updates", seenAt: Date.now() },
    });
    expect(seen.status).toBe(200);

    const badSection = await api("/api/unread/mark-seen", {
      method: "POST",
      token: f.tokenB,
      body: { section: "nope", seenAt: Date.now() },
    });
    expect(badSection.status).toBe(400);
  });
});

describe("plans + expenses", () => {
  it("creates a plan, adds an expense and deletes both", async () => {
    const f = await createPairedCouple();
    const plan = await api<{ plan: { id: string } }>("/api/plans", {
      method: "POST",
      token: f.tokenA,
      body: { title: "Weekend trip" },
    });
    expect(plan.status).toBe(201);
    const planId = plan.data.plan.id;

    const me = await api<{ partnerId: string }>("/api/me", { token: f.tokenA });
    const expense = await api<{ expense: { id: string } }>(
      `/api/plans/${planId}/expenses`,
      {
        method: "POST",
        token: f.tokenA,
        body: { label: "Train", amountCents: 2500, paidByPartnerId: me.data.partnerId },
      },
    );
    expect(expense.status).toBe(201);

    const list = await api<{ expenses: unknown[] }>(`/api/plans/${planId}/expenses`, {
      token: f.tokenB,
    });
    expect(list.data.expenses).toHaveLength(1);

    const delExpense = await api(`/api/plans/${planId}/expenses/${expense.data.expense.id}`, {
      method: "DELETE",
      token: f.tokenA,
    });
    expect(delExpense.status).toBe(200);

    const delPlan = await api(`/api/plans/${planId}`, {
      method: "DELETE",
      token: f.tokenA,
    });
    expect(delPlan.status).toBe(200);
  });

  it("validates plan payloads", async () => {
    const f = await createPairedCouple();
    const bad = await api("/api/plans", {
      method: "POST",
      token: f.tokenA,
      body: { title: "" },
    });
    expect(bad.status).toBe(400);
  });
});
