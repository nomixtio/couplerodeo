import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PlanCard } from "../components/PlanCard";
import { PlanComposer } from "../components/PlanComposer";
import { PageHeaderToggle } from "../components/PageHeaderToggle";
import { PageLoader } from "../components/PageLoader";
import { usePushRefresh } from "../components/PushListener";
import { fetchMe, fetchPlans, type MeResponse, type Plan } from "../lib/api";
import { hasSession } from "../lib/partner";
import { parsePlansTab, type PlansTab } from "../lib/plans-nav";

export const Route = createFileRoute("/plans/")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parsePlansTab(typeof search.tab === "string" ? search.tab : undefined),
  }),
  component: PlansPage,
});

function PlansPage() {
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    const data = await fetchPlans();
    setPlans(data.plans);
  }, []);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    Promise.all([fetchMe(), fetchPlans()])
      .then(([meData, data]) => {
        if (!meData.partnerConnected) {
          navigate({ to: "/pairing" });
          return;
        }
        setMe(meData);
        setPlans(data.plans);
      })
      .catch((err) => {
        console.error(err);
        navigate({ to: "/connect" });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadPlans().catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadPlans]);

  usePushRefresh(() => {
    loadPlans().catch(console.error);
  });

  function selectTab(next: PlansTab) {
    navigate({ to: "/plans", search: { tab: next } });
  }

  if (!me) {
    return (
      <div className="page plans-page">
        <PageLoader label={loading ? "Loading" : "Redirecting"} />
      </div>
    );
  }

  const creating = tab === "new";

  return (
    <div className="page plans-page">
      <div className="page-header">
        <h1>Plans</h1>
        <PageHeaderToggle
          mode={creating ? "close" : "add"}
          addLabel="Create plan"
          closeLabel="Close create plan"
          onClick={() => selectTab(creating ? "all" : "new")}
        />
      </div>

      {creating ? (
        <PlanComposer
          showTitle={false}
          onSaved={(plan) => {
            navigate({
              to: "/plans/$planId",
              params: { planId: plan.id },
            });
          }}
          onCancel={() => selectTab("all")}
        />
      ) : loading ? (
        <p className="hint">Loading…</p>
      ) : plans.length === 0 ? (
        <p className="hint">
          No plans yet. Tap <strong>+</strong> to create your first one.
        </p>
      ) : (
        <div className="thread plans-thread">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPartnerId={me.partnerId}
              onDeleted={() => loadPlans().catch(console.error)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
