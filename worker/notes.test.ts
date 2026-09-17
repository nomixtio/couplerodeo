import { describe, expect, it } from "vitest";
import {
  findNewlyCompletedItems,
  mergeTodoItems,
  parseNoteBody,
} from "./notes";

const ids = (() => {
  let n = 0;
  return () => `id-${++n}`;
})();

describe("parseNoteBody", () => {
  it("accepts a simple note", () => {
    expect(parseNoteBody({ type: "simple", body: " hello " }, ids)).toEqual({
      ok: true,
      data: { type: "simple", title: null, body: "hello" },
    });
  });

  it("rejects empty simple bodies and oversized titles", () => {
    expect(parseNoteBody({ type: "simple", body: "  " }, ids).ok).toBe(false);
    expect(
      parseNoteBody({ type: "simple", body: "ok", title: "x".repeat(121) }, ids).ok,
    ).toBe(false);
    expect(parseNoteBody({ type: "nope" }, ids).ok).toBe(false);
  });

  it("accepts todo notes and assigns ids", () => {
    const result = parseNoteBody(
      { type: "todo", title: "Groceries", items: [{ text: "milk" }] },
      ids,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe("todo");
      expect(result.data).toMatchObject({ type: "todo", title: "Groceries" });
      if (result.data.type === "todo") {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.items[0].text).toBe("milk");
      }
    }
  });

  it("rejects todo notes without title or items", () => {
    expect(parseNoteBody({ type: "todo", title: "", items: [] }, ids).ok).toBe(false);
    expect(
      parseNoteBody({ type: "todo", title: "T", items: [{ text: "" }] }, ids).ok,
    ).toBe(false);
  });
});

describe("mergeTodoItems", () => {
  it("stamps newly completed items and clears un-completed ones", () => {
    const existing = [{ id: "a", text: "milk", done: false }];
    const merged = mergeTodoItems(
      existing,
      [{ id: "a", text: "milk", done: true }],
      "partner-1",
      123,
    );
    expect(merged[0]).toMatchObject({ done: true, completedBy: "partner-1", completedAt: 123 });

    const unmerged = mergeTodoItems(
      [{ id: "a", text: "milk", done: true, completedBy: "partner-1", completedAt: 123 }],
      [{ id: "a", text: "milk", done: false }],
      "partner-1",
      456,
    );
    expect(unmerged[0].completedBy).toBeUndefined();
  });

  it("preserves completion metadata when already done", () => {
    const existing = [{ id: "a", text: "milk", done: true, completedBy: "p1", completedAt: 1 }];
    const merged = mergeTodoItems(existing, [{ id: "a", text: "milk", done: true }], "p2", 2);
    expect(merged[0]).toMatchObject({ completedBy: "p1", completedAt: 1 });
  });
});

describe("findNewlyCompletedItems", () => {
  it("returns only items completed by this partner", () => {
    const existing = [{ id: "a", text: "milk", done: false }];
    const merged = [
      { id: "a", text: "milk", done: true, completedBy: "p1", completedAt: 1 },
      { id: "b", text: "eggs", done: true, completedBy: "p2", completedAt: 1 },
    ];
    expect(findNewlyCompletedItems(existing, merged, "p1")).toHaveLength(1);
    expect(findNewlyCompletedItems(existing, merged, "nobody")).toHaveLength(0);
  });
});
