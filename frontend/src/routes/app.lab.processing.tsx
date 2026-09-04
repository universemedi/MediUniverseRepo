import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { LabOrderBoard, type LabOrderApiDto } from "@/components/common/LabOrderBoard";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/lab/processing")({
  component: () => <ProcessingPage />,
});

function RejectSampleDialog({
  order,
  onDone,
  onClose,
}: {
  order: LabOrderApiDto;
  onDone: () => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/lab/orders/${order.id}/reject-sample`, {
        method: "POST",
        data: { reason: reason.trim() },
      });
      toast.success(`Sample rejected for ${order.patient.name}`, {
        description: "The order is back to awaiting a fresh sample.",
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reject this sample.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject sample — {order.patient.name}</DialogTitle>
          <DialogDescription>{order.orderNumber}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Reason <span className="font-bold text-destructive">*</span>
            </Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Haemolyzed, insufficient quantity, wrong container"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            variant="destructive"
            className="w-full"
            disabled={submitting || !reason.trim()}
            onClick={submit}
          >
            {submitting ? "Saving…" : "Reject sample"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProcessingPage() {
  const [rejecting, setRejecting] = useState<{
    order: LabOrderApiDto;
    reload: () => void;
  } | null>(null);

  return (
    <>
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
                {
                  label: "Reject Sample",
                  onClick: () => setRejecting({ order, reload }),
                },
              ]
            : []
        }
      />
      {rejecting ? (
        <RejectSampleDialog
          order={rejecting.order}
          onClose={() => setRejecting(null)}
          onDone={() => {
            rejecting.reload();
            setRejecting(null);
          }}
        />
      ) : null}
    </>
  );
}
