import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMe } from "../lib/api";
import { EnableNotifications } from "../components/EnableNotifications";
import { hasSession, partnerDisplayName } from "../lib/partner";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const navigate = useNavigate();
  const [partnerName, setPartnerName] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    fetchMe()
      .then((me) => setPartnerName(me.partnerName))
      .catch(() => navigate({ to: "/" }));
  }, [navigate]);

  return (
    <div className="page notifications-page">
      <h1>Notifications</h1>
      <p className="lead">
        You&apos;re connected — enable notifications so you know when{" "}
        {partnerDisplayName(partnerName)} sends a question or answers yours. You can test, refresh,
        or reset them here anytime.
      </p>

      <section className="card setup-card">
        <EnableNotifications />
      </section>
    </div>
  );
}
