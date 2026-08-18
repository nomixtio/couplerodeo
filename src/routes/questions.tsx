import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/questions")({
  beforeLoad: () => {
    throw redirect({ to: "/updates" });
  },
});
