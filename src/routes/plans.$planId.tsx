import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PlanBudgetSection } from "../components/PlanBudgetSection";
import { PlanComposer } from "../components/PlanComposer";
import { PlanMediaAddButton } from "../components/PlanMediaAddButton";
import { PlanMediaGallery } from "../components/PlanMediaGallery";
import { SimpleNoteCard } from "../components/SimpleNoteCard";
import { TodoNoteCard } from "../components/TodoNoteCard";
import { PageLoader } from "../components/PageLoader";
import { usePushRefresh } from "../components/PushListener";
import { formatPlanDateRange } from "../../shared/plans";
import {
  createNote,
  fetchMe,
  fetchPlan,
  fetchPlanNotes,
  type MeResponse,
  type Note,
  type Plan,
} from "../lib/api";
import { hasSession } from "../lib/partner";
import { parsePlanDetailTab, type PlanDetailTab } from "../lib/plans-nav";

export const Route = createFileRoute("/plans/$planId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parsePlanDetailTab(typeof search.tab === "string" ? search.tab : undefined),
  }),
  component: PlanDetailPage,
});

function PlanDetailPage() {
  const { planId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [mediaRefreshKey, setMediaRefreshKey] = useState(0);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const [planData, notesData] = await Promise.all([
      fetchPlan(planId),
      fetchPlanNotes(planId),
    ]);
    setPlan(planData.plan);
    setNotes(notesData.notes);
  }, [planId]);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    Promise.all([fetchMe(), fetchPlan(planId), fetchPlanNotes(planId)])
      .then(([meData, planData, notesData]) => {
        if (!meData.partnerConnected) {
          navigate({ to: "/pairing" });
          return;
        }
        setMe(meData);
        setPlan(planData.plan);
        setNotes(notesData.notes);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load plan");
      })
      .finally(() => setLoading(false));
  }, [planId, navigate]);

  usePushRefresh(() => {
    reload().catch(console.error);
  });

  function selectTab(next: PlanDetailTab) {
    navigate({ to: "/plans/$planId", params: { planId }, search: { tab: next } });
  }

  function handleMediaChange() {
    setMediaRefreshKey((value) => value + 1);
    reload().catch(console.error);
  }

  async function handleAddNote() {
    setAddingNote(true);
    setError("");
    try {
      const result = await createNote({
        type: "simple",
        body: "New plan note",
        planId,
      });
      navigate({ to: "/notes/$noteId", params: { noteId: result.note.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create note");
    } finally {
      setAddingNote(false);
    }
  }

  if (loading) return <PageLoader />;
  if (error) return <p className="hint error">{error}</p>;
  if (!plan || !me) return <p className="hint error">Plan not found.</p>;

  const dateLabel = formatPlanDateRange(plan.start_date, plan.end_date);

  return (
    <div className="page plan-detail-page">
      <p className="breadcrumb">
        <Link to="/plans">← Back to plans</Link>
      </p>

      <header className="plan-detail-header card">
        {plan.cover_thumbnail_url ? (
          <img
            src={plan.cover_thumbnail_url}
            alt=""
            className="plan-detail-cover"
          />
        ) : (
          <div className="plan-detail-cover plan-detail-cover-empty" aria-hidden>
            📋
          </div>
        )}
        <div className="plan-detail-header-body">
          <h1>{plan.title}</h1>
          {dateLabel && <p className="hint">{dateLabel}</p>}
          {plan.description && <p>{plan.description}</p>}
          <div className="plan-detail-header-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? "Cancel edit" : "Edit plan"}
            </button>
            <PlanMediaAddButton
              planId={plan.id}
              onUploaded={handleMediaChange}
            />
          </div>
        </div>
      </header>

      {editing && (
        <PlanComposer
          plan={plan}
          onSaved={(saved) => {
            setPlan(saved);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      <div className="section-tabs" role="tablist" aria-label="Plan sections">
        {(["overview", "notes", "media", "budget"] as PlanDetailTab[]).map(
          (value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={tab === value ? "active" : ""}
              onClick={() => selectTab(value)}
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ),
        )}
      </div>

      {tab === "overview" && (
        <section className="card plan-overview">
          <p>
            <strong>{notes.length}</strong> notes ·{" "}
            <strong>{plan.media_count}</strong> media items
          </p>
          {plan.budget_amount_cents != null && (
            <p className="hint">
              Budget tracked — open the Budget tab for details.
            </p>
          )}
        </section>
      )}

      {tab === "notes" && (
        <section>
          <div className="plan-section-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => handleAddNote().catch(console.error)}
              disabled={addingNote}
            >
              {addingNote ? "Creating…" : "Add note"}
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="hint">No notes for this plan yet.</p>
          ) : (
            <div className="thread notes-thread">
              {notes.map((note) =>
                note.type === "todo" ? (
                  <TodoNoteCard
                    key={note.id}
                    note={note}
                    currentPartnerId={me.partnerId}
                    partnerName={me.partnerName}
                    onUpdated={() => reload().catch(console.error)}
                    onDeleted={() => reload().catch(console.error)}
                  />
                ) : (
                  <SimpleNoteCard
                    key={note.id}
                    note={note}
                    currentPartnerId={me.partnerId}
                    onDeleted={() => reload().catch(console.error)}
                  />
                ),
              )}
            </div>
          )}
        </section>
      )}

      {tab === "media" && (
        <PlanMediaGallery
          planId={plan.id}
          refreshKey={mediaRefreshKey}
          onMediaChange={handleMediaChange}
        />
      )}

      {tab === "budget" && (
        <PlanBudgetSection
          plan={plan}
          me={me}
          onPlanUpdated={(updated) => setPlan(updated)}
        />
      )}
    </div>
  );
}
