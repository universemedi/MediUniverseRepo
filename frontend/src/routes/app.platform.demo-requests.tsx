import { createFileRoute } from "@tanstack/react-router";
import { LeadsBoard } from "@/components/platform/LeadsBoard";

export const Route = createFileRoute("/app/platform/demo-requests")({
  head: () => ({
    meta: [
      { title: "Demo Requests — MediUnivers Platform" },
      { name: "description", content: "Requests booked through the public Request a Demo form." },
    ],
  }),
  component: () => (
    <LeadsBoard
      title="Demo Requests"
      description="Everyone who asked for a guided walkthrough — work the pipeline from here."
      sourceFilter="REQUEST_DEMO"
      emptyLabel="No demo requests yet."
    />
  ),
});
