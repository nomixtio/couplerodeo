import { describe, expect, it } from "vitest";
import { parsePlanBody, parsePlanExpenseBody } from "./plans";

describe("parsePlanBody", () => {
  it("accepts a minimal valid plan", () => {
    expect(parsePlanBody({ title: " Weekend " })).toEqual({
      ok: true,
      data: {
        title: "Weekend",
        description: null,
        startDate: null,
        endDate: null,
        budgetAmountCents: null,
        budgetCurrency: "EUR",
      },
    });
  });

  it("rejects missing titles, bad dates and inverted ranges", () => {
    expect(parsePlanBody({ title: "" }).ok).toBe(false);
    expect(parsePlanBody({ title: "T", startDate: "nope" }).ok).toBe(false);
    expect(
      parsePlanBody({ title: "T", startDate: "2026-09-20", endDate: "2026-09-10" }).ok,
    ).toBe(false);
    expect(parsePlanBody({ title: "T", budgetAmountCents: -5 }).ok).toBe(false);
    expect(parsePlanBody({ title: "T", budgetCurrency: "XX" }).ok).toBe(false);
  });
});

describe("parsePlanExpenseBody", () => {
  it("accepts a valid expense", () => {
    const result = parsePlanExpenseBody({
      label: " Train ",
      amountCents: 1250,
      paidByPartnerId: "p1",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing labels, bad amounts and bad categories", () => {
    expect(
      parsePlanExpenseBody({ label: "", amountCents: 100, paidByPartnerId: "p1" }).ok,
    ).toBe(false);
    expect(
      parsePlanExpenseBody({ label: "T", amountCents: 0, paidByPartnerId: "p1" }).ok,
    ).toBe(false);
    expect(
      parsePlanExpenseBody({ label: "T", amountCents: 100, paidByPartnerId: "" }).ok,
    ).toBe(false);
    expect(
      parsePlanExpenseBody({
        label: "T",
        amountCents: 100,
        paidByPartnerId: "p1",
        category: "yachts",
      }).ok,
    ).toBe(false);
  });
});
