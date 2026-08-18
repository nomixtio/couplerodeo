import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/location")({
  beforeLoad: () => {
    throw redirect({ to: "/updates" });
  },
});
