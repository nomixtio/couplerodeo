import { useEffect, useId, useRef, useState } from "react";
import { formatCalendarDate } from "../../shared/calendar";
import {
  PLAN_DEFAULT_CURRENCY,
  PLAN_DESCRIPTION_MAX_LENGTH,
  PLAN_TITLE_MAX_LENGTH,
} from "../../shared/plans";
import {
  createPlan,
  deletePlan,
  updatePlan,
  type Plan,
} from "../lib/api";

interface PlanComposerProps {
  plan?: Plan;
  backLabel?: string;
  onSaved?: (plan: Plan) => void;
  onCancel?: () => void;
  onDeleted?: () => void;
}

export function PlanComposer({
  plan,
  backLabel = "Plans",
  onSaved,
  onCancel,
  onDeleted,
}: PlanComposerProps) {
  const isEdit = Boolean(plan);
  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(plan?.title ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [startDate, setStartDate] = useState(plan?.start_date ?? "");
  const [endDate, setEndDate] = useState(plan?.end_date ?? "");
  const [budgetEnabled, setBudgetEnabled] = useState(
    plan?.budget_amount_cents != null,
  );
  const [budget, setBudget] = useState(
    plan?.budget_amount_cents != null
      ? String(plan.budget_amount_cents / 100)
      : "",
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) {
      titleRef.current?.focus();
    }
  }, [isEdit]);

  function clearStartDate() {
    setStartDate("");
  }

  function clearEndDate() {
    setEndDate("");
  }

  function addBudget() {
    setBudgetEnabled(true);
  }

  function clearBudget() {
    setBudgetEnabled(false);
    setBudget("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }

    const budgetAmountCents =
      !budgetEnabled || budget.trim() === ""
        ? null
        : Math.round(Number.parseFloat(budget) * 100);

    if (
      budgetEnabled &&
      budget.trim() !== "" &&
      (!Number.isFinite(budgetAmountCents) || budgetAmountCents! < 0)
    ) {
      setError("Invalid budget amount");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: trimmedTitle,
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        budgetCurrency: PLAN_DEFAULT_CURRENCY,
      };

      if (isEdit && plan) {
        const result = await updatePlan(plan.id, {
          ...payload,
          budgetAmountCents,
        });
        onSaved?.(result.plan);
      } else {
        const result = await createPlan({
          ...payload,
          budgetAmountCents: budgetAmountCents ?? undefined,
        });
        onSaved?.(result.plan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!plan) return;
    if (!window.confirm(`Delete "${plan.title}"?`)) return;
    setDeleting(true);
    setError("");
    try {
      await deletePlan(plan.id);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <div className="note-sheet calendar-sheet">
      <header className="note-sheet-toolbar">
        <button
          type="button"
          className="note-sheet-back"
          onClick={onCancel}
          disabled={busy}
        >
          ← {backLabel}
        </button>
        <div className="note-sheet-toolbar-actions">
          {isEdit && (
            <button
              type="button"
              className="note-sheet-delete-btn"
              onClick={() => handleDelete().catch(console.error)}
              disabled={busy}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
          <button
            type="submit"
            form={formId}
            className="note-sheet-done-btn"
            disabled={busy}
          >
            {saving ? "Saving…" : "Done"}
          </button>
        </div>
      </header>

      <div className="note-sheet-surface calendar-sheet-surface">
        <form id={formId} onSubmit={handleSubmit} className="note-sheet-form">
          <input
            ref={titleRef}
            type="text"
            className="note-sheet-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Plan title"
            maxLength={PLAN_TITLE_MAX_LENGTH}
            disabled={busy}
            aria-label="Title"
            required
          />

          <div className="calendar-sheet-meta">
            <div className="calendar-sheet-meta-row">
              <span className="calendar-sheet-meta-label">Start</span>
              <label className="calendar-sheet-meta-value">
                <span
                  className={`calendar-sheet-meta-display${startDate ? "" : " is-placeholder"}`}
                >
                  {startDate ? formatCalendarDate(startDate) : "Choose a date"}
                </span>
                <input
                  type="date"
                  className="calendar-sheet-meta-picker"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={busy}
                  aria-label="Start date"
                />
              </label>
              {startDate && (
                <button
                  type="button"
                  className="note-sheet-list-remove"
                  onClick={clearStartDate}
                  disabled={busy}
                  aria-label="Clear start date"
                >
                  ×
                </button>
              )}
            </div>
            <div className="calendar-sheet-meta-row">
              <span className="calendar-sheet-meta-label">End</span>
              <label className="calendar-sheet-meta-value">
                <span
                  className={`calendar-sheet-meta-display${endDate ? "" : " is-placeholder"}`}
                >
                  {endDate ? formatCalendarDate(endDate) : "Choose a date"}
                </span>
                <input
                  type="date"
                  className="calendar-sheet-meta-picker"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={busy}
                  aria-label="End date"
                />
              </label>
              {endDate && (
                <button
                  type="button"
                  className="note-sheet-list-remove"
                  onClick={clearEndDate}
                  disabled={busy}
                  aria-label="Clear end date"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <textarea
            className="note-sheet-body calendar-sheet-notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you planning together?"
            maxLength={PLAN_DESCRIPTION_MAX_LENGTH}
            disabled={busy}
            aria-label="Description"
          />

          <div className="calendar-sheet-reminder">
            {budgetEnabled ? (
              <div className="calendar-sheet-meta-row">
                <span className="calendar-sheet-meta-label">Budget</span>
                <label className="calendar-sheet-meta-value">
                  <input
                    type="number"
                    className="calendar-sheet-meta-text"
                    min="0"
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    disabled={busy}
                    placeholder="0.00"
                    aria-label="Budget target"
                  />
                </label>
                <button
                  type="button"
                  className="note-sheet-list-remove"
                  onClick={clearBudget}
                  disabled={busy}
                  aria-label="Remove budget"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="note-sheet-add-item"
                onClick={addBudget}
                disabled={busy}
              >
                Add a budget
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <p className="hint error note-sheet-error">{error}</p>}
    </div>
  );
}
