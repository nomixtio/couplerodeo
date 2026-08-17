import { useCallback, useEffect, useState } from "react";
import { PLAN_EXPENSE_CATEGORIES, formatMoney } from "../../shared/plans";
import {
  createPlanExpense,
  deletePlanExpense,
  fetchPlanExpenses,
  updatePlan,
  type MeResponse,
  type Plan,
  type PlanExpense,
} from "../lib/api";
import { formatUpdateDate } from "../lib/format";

interface PlanBudgetSectionProps {
  plan: Plan;
  me: MeResponse;
  onPlanUpdated?: (plan: Plan) => void;
}

export function PlanBudgetSection({
  plan,
  me,
  onPlanUpdated,
}: PlanBudgetSectionProps) {
  const [expenses, setExpenses] = useState<PlanExpense[]>([]);
  const [spentCents, setSpentCents] = useState(plan.spent_cents);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paidBy, setPaidBy] = useState(me.partnerId);
  const [budgetInput, setBudgetInput] = useState(
    plan.budget_amount_cents != null
      ? String(plan.budget_amount_cents / 100)
      : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadExpenses = useCallback(async () => {
    const data = await fetchPlanExpenses(plan.id);
    setExpenses(data.expenses);
    setSpentCents(data.spentCents);
  }, [plan.id]);

  useEffect(() => {
    loadExpenses()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loadExpenses]);

  const partnerTotals = expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.paid_by_partner_id] =
      (acc[expense.paid_by_partner_id] ?? 0) + expense.amount_cents;
    return acc;
  }, {});

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(Number.parseFloat(amount) * 100);
    if (!label.trim() || !Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Enter a valid label and amount");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await createPlanExpense(plan.id, {
        label: label.trim(),
        amountCents,
        paidByPartnerId: paidBy,
        category: category || undefined,
      });
      setLabel("");
      setAmount("");
      setCategory("");
      await loadExpenses();
      onPlanUpdated?.(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBudget() {
    const budgetAmountCents =
      budgetInput.trim() === ""
        ? null
        : Math.round(Number.parseFloat(budgetInput) * 100);

    if (
      budgetInput.trim() !== "" &&
      (!Number.isFinite(budgetAmountCents) || budgetAmountCents! < 0)
    ) {
      setError("Invalid budget amount");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const result = await updatePlan(plan.id, {
        title: plan.title,
        description: plan.description ?? undefined,
        startDate: plan.start_date ?? undefined,
        endDate: plan.end_date ?? undefined,
        budgetAmountCents,
        budgetCurrency: plan.budget_currency,
      });
      onPlanUpdated?.(result.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update budget");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!window.confirm("Remove this expense?")) return;
    try {
      await deletePlanExpense(plan.id, expenseId);
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const remaining =
    plan.budget_amount_cents != null
      ? plan.budget_amount_cents - spentCents
      : null;

  return (
    <section className="plan-budget-section card">
      <h2>Budget</h2>

      <div className="plan-budget-summary">
        <p>
          Spent:{" "}
          <strong>{formatMoney(spentCents, plan.budget_currency)}</strong>
        </p>
        {plan.budget_amount_cents != null && (
          <>
            <p>
              Target:{" "}
              <strong>
                {formatMoney(plan.budget_amount_cents, plan.budget_currency)}
              </strong>
            </p>
            <p>
              Remaining:{" "}
              <strong>
                {formatMoney(remaining ?? 0, plan.budget_currency)}
              </strong>
            </p>
            <div
              className="plan-budget-bar"
              role="progressbar"
              aria-valuenow={Math.min(spentCents, plan.budget_amount_cents)}
              aria-valuemin={0}
              aria-valuemax={plan.budget_amount_cents}
            >
              <div
                className="plan-budget-bar-fill"
                style={{
                  width: `${Math.min(100, (spentCents / plan.budget_amount_cents) * 100)}%`,
                }}
              />
            </div>
          </>
        )}
      </div>

      <div className="plan-budget-target composer">
        <label>
          Budget target
          <input
            type="number"
            min="0"
            step="0.01"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            disabled={saving}
            placeholder="0.00"
          />
        </label>
        <div className="calendar-composer-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => handleSaveBudget().catch(console.error)}
            disabled={saving}
          >
            {saving ? "Saving…" : "Update target"}
          </button>
        </div>
      </div>

      <div className="plan-budget-split">
        <h3>By partner</h3>
        {me.partners.map((partner) => (
          <p key={partner.id}>
            {partner.label}:{" "}
            {formatMoney(partnerTotals[partner.id] ?? 0, plan.budget_currency)}
          </p>
        ))}
      </div>

      <form onSubmit={handleAddExpense} className="plan-expense-form composer">
        <h3>Add expense</h3>
        <label>
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={saving}
            placeholder="Train tickets, hotel…"
            required
          />
        </label>
        <label>
          Amount
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={saving}
            placeholder="0.00"
            required
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={saving}
          >
            <option value="">None</option>
            {PLAN_EXPENSE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Paid by
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            disabled={saving}
          >
            {me.partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="hint error">{error}</p>}

        <div className="calendar-composer-actions">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Saving…" : "Add expense"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="hint">Loading expenses…</p>
      ) : expenses.length === 0 ? (
        <p className="hint">No expenses yet.</p>
      ) : (
        <ul className="plan-expense-list">
          {expenses.map((expense) => (
            <li key={expense.id} className="plan-expense-item">
              <div>
                <strong>{expense.label}</strong>
                {expense.category && (
                  <span className="badge">{expense.category}</span>
                )}
                <p className="hint">
                  Paid by {expense.paid_by_label} ·{" "}
                  {formatUpdateDate(expense.created_at)}
                </p>
              </div>
              <div className="plan-expense-item-actions">
                <span>
                  {formatMoney(expense.amount_cents, plan.budget_currency)}
                </span>
                <button
                  type="button"
                  className="btn ghost note-delete-btn"
                  onClick={() => handleDeleteExpense(expense.id).catch(console.error)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
