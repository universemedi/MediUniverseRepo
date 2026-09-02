import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppointmentBoard, type AppointmentApiDto } from "@/components/common/AppointmentBoard";
import { apiFetch, ApiError } from "@/lib/api";

export const Route = createFileRoute("/app/clinic/queue")({
  component: () => <QueuePage />,
});

function QueuePage() {
  return (
    <AppointmentBoard
      path="clinic/queue"
      filter={(a: AppointmentApiDto) => a.status === "CHECKED_IN" || a.status === "IN_CONSULTATION"}
      emptyMessage="No one in the queue right now."
      actions={(a, { reload }) =>
        a.status === "CHECKED_IN"
          ? [
              {
                label: "Start Consultation",
                onClick: async () => {
                  try {
                    await apiFetch(`/api/clinic/consultations/start/${a.id}`, { method: "POST" });
                    toast.success(`${a.patient.name} moved into consultation`);
                    reload();
                  } catch (err) {
                    toast.error(
                      err instanceof ApiError ? err.message : "Couldn't start this consultation.",
                    );
                  }
                },
              },
            ]
          : []
      }
    />
  );
}
