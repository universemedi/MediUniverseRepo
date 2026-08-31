import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { LabOrderBoard } from "@/components/common/LabOrderBoard";
import { apiFetch, ApiError } from "@/lib/api";

export const Route = createFileRoute("/app/lab/processing")({
  component: () => <ProcessingPage />,
});

function ProcessingPage() {
  return (
    <LabOrderBoard
      path="lab/processing"
      statuses={["COLLECTED", "PROCESSING"]}
      emptyMessage="Nothing on the work bench right now."
      actions={(order, { reload }) =>
        order.status === "COLLECTED"
          ? [
              {
                label: "Start Processing",
                onClick: async () => {
                  try {
                    await apiFetch(`/api/lab/orders/${order.id}/start-processing`, {
                      method: "POST",
                    });
                    toast.success(`${order.orderNumber} moved to processing`);
                    reload();
                  } catch (err) {
                    toast.error(
                      err instanceof ApiError ? err.message : "Couldn't start processing.",
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
