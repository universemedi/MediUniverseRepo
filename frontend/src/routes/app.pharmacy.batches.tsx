import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { apiFetch, ApiError } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";
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

export const Route = createFileRoute("/app/pharmacy/batches")({
  component: () => <BatchesPage />,
});

interface OrgBatchApiDto {
  id: number;
  batchNumber: string;
  medicineName: string;
  branchName: string;
  expiryDate: string;
  mrp: number;
  quantityAvailable: number;
  expired: boolean;
}

function daysLeft(expiryDate: string): number {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const COLUMNS = [
  col("batch", "Batch", "code"),
  col("medicine", "Medicine", "text"),
  col("branch", "Branch", "org", { secondary: true }),
  col("quantity", "Quantity", "number"),
  col("mrp", "MRP", "money", { secondary: true }),
  col("expiry", "Expiry", "date"),
  col("status", "Status", "badge", { options: ["Good", "Near Expiry", "Expired"] }),
];

function toRow(b: OrgBatchApiDto): Row {
  const left = daysLeft(b.expiryDate);
  const status = b.expired ? "Expired" : left <= 30 ? "Near Expiry" : "Good";
  return {
    id: String(b.id),
    batch: b.batchNumber,
    medicine: b.medicineName,
    branch: b.branchName,
    quantity: b.quantityAvailable,
    mrp: `₹ ${b.mrp.toLocaleString("en-IN")}`,
    expiry: b.expiryDate,
    status,
  };
}

function AdjustStockDialog({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const qty = Number(quantityChange);
    if (!qty)
      return setError(
        "Enter a non-zero quantity — negative to write off, positive to correct an undercount.",
      );
    if (!reason.trim()) return setError("A reason is required.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/pharmacy/stock-adjustments", {
        method: "POST",
        data: { batchId: Number(row.id), quantityChange: qty, reason: reason.trim() },
      });
      toast.success(`${row["medicine"]} adjusted`, {
        description: `${row["batch"]}: ${qty > 0 ? "+" : ""}${qty} unit(s).`,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't adjust this batch.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock — {row["medicine"]}</DialogTitle>
          <DialogDescription>
            Batch {row["batch"]} · {row["quantity"]} unit(s) currently available.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Quantity change</Label>
            <Input
              type="number"
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              placeholder="e.g. -5 to write off, +5 to correct an undercount"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Reason <span className="font-bold text-destructive">*</span>
            </Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Damaged in storage, breakage, physical count correction"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={submitting} onClick={submit}>
            {submitting ? "Saving…" : "Save adjustment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** New batches are received through Purchases → Goods Receipt; the row action here handles
 * write-offs and count corrections on existing batches (damage, loss, physical stock counts). */
function BatchesPage() {
  const [adjusting, setAdjusting] = useState<Row | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  return (
    <>
      <RealModulePage<OrgBatchApiDto>
        key={reloadTick}
        path="pharmacy/batches"
        basePath="/api/pharmacy/batches"
        columns={COLUMNS}
        toRow={toRow}
        supportsDelete={false}
        rowActions={(row) => [
          {
            label: "Adjust stock",
            icon: <Scale className="h-4 w-4" />,
            onClick: () => setAdjusting(row),
          },
        ]}
      />
      {adjusting ? (
        <AdjustStockDialog
          row={adjusting}
          onClose={() => setAdjusting(null)}
          onDone={() => {
            setAdjusting(null);
            setReloadTick((t) => t + 1);
          }}
        />
      ) : null}
    </>
  );
}
