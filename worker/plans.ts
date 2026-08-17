import {
  isValidPlanDateRange,
  normalizeBudgetAmountCents,
  normalizePlanCurrency,
  normalizePlanDate,
  normalizePlanDescription,
  normalizePlanTitle,
  PLAN_EXPENSE_CATEGORIES,
  PLAN_EXPENSE_LABEL_MAX_LENGTH,
  type PlanExpenseCategory,
} from "../shared/plans";

export interface PlanInput {
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  budgetAmountCents: number | null;
  budgetCurrency: string;
}

export interface PlanExpenseInput {
  label: string;
  amountCents: number;
  paidByPartnerId: string;
  category: PlanExpenseCategory | null;
  expenseDate: string | null;
}

export function parsePlanBody(
  body: {
    title?: unknown;
    description?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    budgetAmountCents?: unknown;
    budgetCurrency?: unknown;
  },
):
  | { ok: true; data: PlanInput }
  | { ok: false; error: string } {
  const title = normalizePlanTitle(body.title);
  if (!title) {
    return { ok: false, error: "Title is required (max 100 characters)" };
  }

  const description = normalizePlanDescription(body.description);
  if (body.description != null && body.description !== "" && description === null) {
    return { ok: false, error: "Description is too long" };
  }

  const startDate = normalizePlanDate(body.startDate);
  if (body.startDate != null && body.startDate !== "" && startDate === null) {
    return { ok: false, error: "Invalid start date" };
  }

  const endDate = normalizePlanDate(body.endDate);
  if (body.endDate != null && body.endDate !== "" && endDate === null) {
    return { ok: false, error: "Invalid end date" };
  }

  if (!isValidPlanDateRange(startDate, endDate)) {
    return { ok: false, error: "End date must be on or after start date" };
  }

  const budgetAmountCents = normalizeBudgetAmountCents(body.budgetAmountCents);
  if (
    body.budgetAmountCents != null &&
    body.budgetAmountCents !== "" &&
    budgetAmountCents === null
  ) {
    return { ok: false, error: "Invalid budget amount" };
  }

  const budgetCurrency = normalizePlanCurrency(body.budgetCurrency);
  if (budgetCurrency === null) {
    return { ok: false, error: "Invalid currency code" };
  }

  return {
    ok: true,
    data: {
      title,
      description,
      startDate,
      endDate: endDate ?? startDate,
      budgetAmountCents,
      budgetCurrency,
    },
  };
}

function normalizeExpenseLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > PLAN_EXPENSE_LABEL_MAX_LENGTH) return null;
  return trimmed;
}

function normalizeExpenseCategory(value: unknown): PlanExpenseCategory | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  return (PLAN_EXPENSE_CATEGORIES as readonly string[]).includes(value)
    ? (value as PlanExpenseCategory)
    : null;
}

function normalizeExpenseAmountCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const cents = Math.round(value);
  if (cents <= 0) return null;
  return cents;
}

export function parsePlanExpenseBody(
  body: {
    label?: unknown;
    amountCents?: unknown;
    paidByPartnerId?: unknown;
    category?: unknown;
    expenseDate?: unknown;
  },
):
  | { ok: true; data: PlanExpenseInput }
  | { ok: false; error: string } {
  const label = normalizeExpenseLabel(body.label);
  if (!label) {
    return { ok: false, error: "Expense label is required" };
  }

  const amountCents = normalizeExpenseAmountCents(body.amountCents);
  if (amountCents === null) {
    return { ok: false, error: "Amount must be a positive number" };
  }

  if (typeof body.paidByPartnerId !== "string" || !body.paidByPartnerId.trim()) {
    return { ok: false, error: "Paid by partner is required" };
  }

  const category = normalizeExpenseCategory(body.category);
  if (body.category != null && body.category !== "" && category === null) {
    return { ok: false, error: "Invalid expense category" };
  }

  const expenseDate = normalizePlanDate(body.expenseDate);
  if (body.expenseDate != null && body.expenseDate !== "" && expenseDate === null) {
    return { ok: false, error: "Invalid expense date" };
  }

  return {
    ok: true,
    data: {
      label,
      amountCents,
      paidByPartnerId: body.paidByPartnerId.trim(),
      category,
      expenseDate,
    },
  };
}
