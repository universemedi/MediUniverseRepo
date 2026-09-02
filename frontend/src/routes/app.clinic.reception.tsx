import { createFileRoute } from "@tanstack/react-router";
import { AppointmentBoard, type AppointmentApiDto } from "@/components/common/AppointmentBoard";

export const Route = createFileRoute("/app/clinic/reception")({
  component: () => <ReceptionPage />,
});

function ReceptionPage() {
  return (
    <AppointmentBoard
      path="clinic/reception"
      filter={(a: AppointmentApiDto) => a.status === "BOOKED" || a.status === "CHECKED_IN"}
      emptyMessage="No visitors waiting at reception right now."
      actions={(a, { setStatus }) =>
        a.status === "BOOKED"
          ? [
              { label: "Check In", onClick: () => setStatus(a, "CHECKED_IN") },
              { label: "No-show", onClick: () => setStatus(a, "NO_SHOW") },
            ]
          : []
      }
    />
  );
}
