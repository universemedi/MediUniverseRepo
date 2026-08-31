import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { LabOrderBoard } from "@/components/common/LabOrderBoard";
import { apiFetch, ApiError } from "@/lib/api";

export const Route = createFileRoute("/app/lab/review")({
  component: () => <ReviewPage />,
});

function ReviewPage() {
  return (
    <LabOrderBoard
      path="lab/review"
      statuses={["RESULT_READY"]}
      emptyMessage="No results waiting for review."
      actions={(order, { reload }) => [
        {
          label: "Verify Results",
          onClick: async () => {
            try {
              await apiFetch(`/api/lab/orders/${order.id}/results/verify`, {
                method: "POST",
                data: { orderItemIds: order.items.map((i) => i.id) },
              });
              toast.success(`${order.orderNumber} verified`);
              reload();
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Couldn't verify these results.");
            }
          },
        },
      ]}
    />
  );
}
