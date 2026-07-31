import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { hasSession } from "../lib/partner";
import { PageLoader } from "../components/PageLoader";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    navigate({ to: "/settings", replace: true });
  }, [navigate]);

  return (
    <div className="page settings-page">
      <PageLoader label="Redirecting" />
    </div>
  );
}
