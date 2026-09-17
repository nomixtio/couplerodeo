import { describe, expect, it } from "vitest";
import { api, createPairedCouple } from "./helpers";

describe("calendar events", () => {
  it("requires from/to on list and validates create", async () => {
    const f = await createPairedCouple();
    const missing = await api("/api/calendar/events?from=2026-09-01", { token: f.tokenA });
    expect(missing.status).toBe(400);

    const bad = await api("/api/calendar/events", {
      method: "POST",
      token: f.tokenA,
      body: { title: "", eventDate: "2026-09-20" },
    });
    expect(bad.status).toBe(400);
  });

  it("creates, lists, updates and deletes an event", async () => {
    const f = await createPairedCouple();
    const created = await api<{ event: { id: string; title: string } }>(
      "/api/calendar/events",
      {
        method: "POST",
        token: f.tokenA,
        body: { title: "Anniversary", eventDate: "2026-10-01", eventTime: "19:00" },
      },
    );
    expect(created.status).toBe(201);
    const id = created.data.event.id;

    const list = await api<{ events: Array<{ id: string }> }>(
      "/api/calendar/events?from=2026-09-01&to=2026-11-01",
      { token: f.tokenB },
    );
    expect(list.data.events.some((e) => e.id === id)).toBe(true);

    const updated = await api<{ event: { title: string } }>(
      `/api/calendar/events/${id}`,
      {
        method: "PATCH",
        token: f.tokenA,
        body: { title: "Anniversary!", eventDate: "2026-10-01", eventTime: "19:00" },
      },
    );
    expect(updated.status).toBe(200);
    expect(updated.data.event.title).toBe("Anniversary!");

    const deleted = await api(`/api/calendar/events/${id}`, {
      method: "DELETE",
      token: f.tokenA,
    });
    expect(deleted.status).toBe(200);

    const missing = await api(`/api/calendar/events/${id}`, {
      method: "PATCH",
      token: f.tokenA,
      body: { title: "x", eventDate: "2026-10-01" },
    });
    expect(missing.status).toBe(404);
  });
});

describe("notes", () => {
  it("creates simple + todo notes and lists them", async () => {
    const f = await createPairedCouple();
    const simple = await api<{ note: { id: string } }>("/api/notes", {
      method: "POST",
      token: f.tokenA,
      body: { type: "simple", body: "buy milk" },
    });
    expect(simple.status).toBe(201);

    const todo = await api<{ note: { id: string } }>("/api/notes", {
      method: "POST",
      token: f.tokenA,
      body: { type: "todo", title: "Trip", items: [{ text: "pack" }, { text: "book" }] },
    });
    expect(todo.status).toBe(201);

    const list = await api<{ notes: Array<{ id: string }> }>("/api/notes", {
      token: f.tokenB,
    });
    expect(list.status).toBe(200);
    expect(list.data.notes.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects invalid note payloads", async () => {
    const f = await createPairedCouple();
    const bad = await api("/api/notes", {
      method: "POST",
      token: f.tokenA,
      body: { type: "todo", title: "", items: [] },
    });
    expect(bad.status).toBe(400);
  });

  it("updates and deletes a note", async () => {
    const f = await createPairedCouple();
    const created = await api<{ note: { id: string } }>("/api/notes", {
      method: "POST",
      token: f.tokenA,
      body: { type: "simple", body: "draft" },
    });
    const id = created.data.note.id;

    const updated = await api(`/api/notes/${id}`, {
      method: "PATCH",
      token: f.tokenA,
      body: { type: "simple", body: "final" },
    });
    expect(updated.status).toBe(200);

    const deleted = await api(`/api/notes/${id}`, {
      method: "DELETE",
      token: f.tokenA,
    });
    expect(deleted.status).toBe(200);
  });
});
