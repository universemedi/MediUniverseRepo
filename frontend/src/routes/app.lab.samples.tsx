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

export const Route = createFileRoute("/app/lab/samples")({
  component: () => <SamplesPage />,
});

function CollectSampleDialog({
  order,
  onDone,
  onClose,
}: {
  order: LabOrderApiDto;
  onDone: () => void;
  onClose: () => void;
}) {
  const [sampleTypes, setSampleTypes] = useState(
    [...new Set(order.items.map((i) => i.sampleType))].join(", "),
  );
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!sampleTypes.trim()) {
      setError("Sample type is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/lab/orders/${order.id}/collect-sample`, {
        method: "POST",
        data: { sampleTypes: sampleTypes.trim(), remarks: remarks.trim() || null },
      });
      toast.success(`Sample collected for ${order.patient.fullName}`);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't record this collection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Collect sample — {order.patient.fullName}</DialogTitle>
          <DialogDescription>{order.orderNumber}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Sample type(s) <span className="font-bold text-destructive">*</span>
            </Label>
            <Input value={sampleTypes} onChange={(e) => setSampleTypes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={submitting} onClick={submit}>
            {submitting ? "Recording…" : "Record collection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SamplesPage() {
  const [collecting, setCollecting] = useState<{
    order: LabOrderApiDto;
    reload: () => void;
  } | null>(null);

  return (
    <>
      <LabOrderBoard
        path="lab/samples"
        statuses={["SAMPLE_PENDING"]}
        emptyMessage="No samples pending collection."
        actions={(order, { reload }) => [
          { label: "Collect Sample", onClick: () => setCollecting({ order, reload }) },
        ]}
      />
      {collecting ? (
        <CollectSampleDialog
          order={collecting.order}
          onClose={() => setCollecting(null)}
          onDone={() => {
            collecting.reload();
            setCollecting(null);
          }}
        />
      ) : null}
    </>
  );
}
