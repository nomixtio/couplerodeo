import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/answer/$questionId")({
  beforeLoad: () => {
    throw redirect({ to: "/updates" });
  },
});
