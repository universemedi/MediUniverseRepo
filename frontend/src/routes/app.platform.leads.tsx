import { createFileRoute } from "@tanstack/react-router";
import { LeadsBoard } from "@/components/platform/LeadsBoard";

export const Route = createFileRoute("/app/platform/leads")({
  head: () => ({
    meta: [
      { title: "Leads — MediUnivers Platform" },
      { name: "description", content: "Every lead captured from the public website." },
    ],
  }),
  component: () => (
    <LeadsBoard
      title="Leads"
      description="Every enquiry captured from the public website — contact, pricing, demo and trial forms."
      emptyLabel="No leads yet."
    />
  ),
});
