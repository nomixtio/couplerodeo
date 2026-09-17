import { describe, expect, it } from "vitest";
import { api, createPairedCouple } from "./helpers";

describe("POST /api/updates (text)", () => {
  it("creates a text update and lists it", async () => {
    const f = await createPairedCouple("Alex", "Sam");
    const created = await api<{ update: { id: string; text: string } }>("/api/updates", {
      method: "POST",
      token: f.tokenA,
      body: { text: "  hello there  " },
    });
    expect(created.status).toBe(201);
    expect(created.data.update.text).toBe("hello there");

    const list = await api<{ updates: Array<{ id: string }> }>("/api/updates", {
      token: f.tokenB,
    });
    expect(list.status).toBe(200);
    expect(list.data.updates.some((u) => u.id === created.data.update.id)).toBe(true);
  });

  it("rejects empty and oversized updates", async () => {
    const f = await createPairedCouple();
    const empty = await api("/api/updates", {
      method: "POST",
      token: f.tokenA,
      body: { text: "   " },
    });
    expect(empty.status).toBe(400);
    const long = await api("/api/updates", {
      method: "POST",
      token: f.tokenA,
      body: { text: "x".repeat(201) },
    });
    expect(long.status).toBe(400);
  });
});

describe("POST /api/updates (question kind)", () => {
  it("creates scale and choice questions", async () => {
    const f = await createPairedCouple();
    const scale = await api<{ update: { id: string } }>("/api/updates", {
      method: "POST",
      token: f.tokenA,
      body: { kind: "question", type: "scale", text: "How was today?" },
    });
    expect(scale.status).toBe(201);

    const choice = await api("/api/updates", {
      method: "POST",
      token: f.tokenA,
      body: { kind: "question", type: "choice", text: "Dinner?", options: ["Pizza", "Sushi"] },
    });
    expect(choice.status).toBe(201);
  });

  it("validates question payloads", async () => {
    const f = await createPairedCouple();
    const badType = await api("/api/updates", {
      method: "POST",
      token: f.tokenA,
      body: { kind: "question", type: "nope", text: "Hi" },
    });
    expect(badType.status).toBe(400);
    const oneOption = await api("/api/updates", {
      method: "POST",
      token: f.tokenA,
      body: { kind: "question", type: "choice", text: "Pick?", options: ["only"] },
    });
    expect(oneOption.status).toBe(400);
  });
});

describe("POST /api/updates/:id/respond", () => {
  it("answers a scale question and blocks duplicates + self-answers", async () => {
    const f = await createPairedCouple();
    const q = await api<{ update: { id: string } }>("/api/updates", {
      method: "POST",
      token: f.tokenA,
      body: { kind: "question", type: "scale", text: "Rate today" },
    });
    const id = q.data.update.id;

    const selfAnswer = await api(`/api/updates/${id}/respond`, {
      method: "POST",
      token: f.tokenA,
      body: { value: "5" },
    });
    expect(selfAnswer.status).toBe(400);

    const answer = await api(`/api/updates/${id}/respond`, {
      method: "POST",
      token: f.tokenB,
      body: { value: "4" },
    });
    expect(answer.status).toBe(201);

    const duplicate = await api(`/api/updates/${id}/respond`, {
      method: "POST",
      token: f.tokenB,
      body: { value: "3" },
    });
    expect(duplicate.status).toBe(409);

    const badValue = await api(`/api/updates/${id}/respond`, {
      method: "POST",
      token: f.tokenB,
      body: { value: "9" },
    });
    // already responded takes precedence, but value validation happens first on fresh questions
    expect([400, 409]).toContain(badValue.status);
  });
});

describe("DELETE + POST /api/updates/:id/restore", () => {
  it("soft-deletes and restores an update", async () => {
    const f = await createPairedCouple();
    const created = await api<{ update: { id: string } }>("/api/updates", {
      method: "POST",
      token: f.tokenA,
      body: { text: "bye for now" },
    });
    const id = created.data.update.id;

    const del = await api(`/api/updates/${id}`, { method: "DELETE", token: f.tokenA });
    expect(del.status).toBe(200);

    const delAgain = await api(`/api/updates/${id}`, { method: "DELETE", token: f.tokenA });
    expect(delAgain.status).toBe(409);

    const restore = await api(`/api/updates/${id}/restore`, {
      method: "POST",
      token: f.tokenA,
    });
    expect(restore.status).toBe(200);
  });
});
