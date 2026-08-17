import { Link } from "@tanstack/react-router";
import { formatPlanDateRange, formatMoney } from "../../shared/plans";
import { deletePlan, type Plan } from "../lib/api";
import { formatUpdateDate } from "../lib/format";
import { partnerLabel } from "../lib/partner";
import { useState } from "react";

interface PlanCardProps {
  plan: Plan;
  currentPartnerId: string;
  onDeleted?: () => void;
}

export function PlanCard({ plan, currentPartnerId, onDeleted }: PlanCardProps) {
  const isMine = plan.from_partner_id === currentPartnerId;
  const dateLabel = formatPlanDateRange(plan.start_date, plan.end_date);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm(`Remove plan "${plan.title}"?`)) return;
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

  return (
    <article className={`plan-card card ${isMine ? "mine" : "theirs"}`}>
      <Link
        to="/plans/$planId"
        params={{ planId: plan.id }}
        className="plan-card-link"
      >
        <h3 className="plan-card-title">{plan.title}</h3>
        {dateLabel && <p className="hint plan-card-dates">{dateLabel}</p>}
        {plan.description && (
          <p className="plan-card-description">{plan.description}</p>
        )}
        <p className="hint plan-card-meta">
          {plan.note_count} notes · {plan.media_count} media
          {plan.budget_amount_cents != null && (
            <>
              {" "}
              · {formatMoney(plan.spent_cents, plan.budget_currency)} /{" "}
              {formatMoney(plan.budget_amount_cents, plan.budget_currency)}
            </>
          )}
        </p>
      </Link>

      <footer className="plan-card-footer">
        <span className="meta">
          {partnerLabel(
            plan.from_partner_id,
            currentPartnerId,
            plan.from_label,
          )}{" "}
          · {formatUpdateDate(plan.updated_at)}
        </span>
        <button
          type="button"
          className="btn ghost note-delete-btn"
          onClick={() => handleDelete().catch(console.error)}
          disabled={deleting}
        >
          {deleting ? "Removing…" : "Remove"}
        </button>
      </footer>

      {error && <p className="hint error">{error}</p>}
    </article>
  );
}
