import { useState } from "react";
import {
  PLAN_DESCRIPTION_MAX_LENGTH,
  PLAN_TITLE_MAX_LENGTH,
} from "../../shared/plans";
import { createPlan, updatePlan, type Plan } from "../lib/api";

interface PlanComposerProps {
  plan?: Plan;
  showTitle?: boolean;
  onSaved?: (plan: Plan) => void;
  onCancel?: () => void;
}

export function PlanComposer({
  plan,
  showTitle = true,
  onSaved,
  onCancel,
}: PlanComposerProps) {
  const isEdit = Boolean(plan);
  const [title, setTitle] = useState(plan?.title ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [startDate, setStartDate] = useState(plan?.start_date ?? "");
  const [endDate, setEndDate] = useState(plan?.end_date ?? "");
  const [budget, setBudget] = useState(
    plan?.budget_amount_cents != null
      ? String(plan.budget_amount_cents / 100)
      : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const budgetAmountCents =
      budget.trim() === ""
        ? null
        : Math.round(Number.parseFloat(budget) * 100);

    if (budget.trim() !== "" && (!Number.isFinite(budgetAmountCents) || budgetAmountCents! < 0)) {
      setError("Invalid budget amount");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        budgetAmountCents,
      };

      if (isEdit && plan) {
        const result = await updatePlan(plan.id, payload);
        onSaved?.(result.plan);
      } else {
        const result = await createPlan(payload);
        onSaved?.(result.plan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="plan-composer card composer">
      {showTitle && <h2>{isEdit ? "Edit plan" : "Create plan"}</h2>}

      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input
            type="text"
            value={title}
            maxLength={PLAN_TITLE_MAX_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summer trip, kitchen reno…"
            required
            disabled={saving}
          />
        </label>

        <label>
          Description (optional)
          <textarea
            value={description}
            maxLength={PLAN_DESCRIPTION_MAX_LENGTH}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you planning together?"
            rows={4}
            disabled={saving}
          />
        </label>

        <div className="plan-date-row">
          <label>
            Start date
            <span className="calendar-native-input">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={saving}
              />
            </span>
          </label>
          <label>
            End date
            <span className="calendar-native-input">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={saving}
              />
            </span>
          </label>
        </div>

        <label>
          Budget target (optional)
          <input
            type="number"
            min="0"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            disabled={saving}
            placeholder="0.00"
          />
        </label>

        {error && <p className="hint error">{error}</p>}

        <div className="calendar-composer-actions">
          {onCancel && (
            <button
              type="button"
              className="btn ghost"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          )}
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create plan"}
          </button>
        </div>
      </form>
    </div>
  );
}
