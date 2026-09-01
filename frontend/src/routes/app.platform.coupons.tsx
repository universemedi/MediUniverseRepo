import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { col } from "@/config/types";
import type { CouponApiDto, PlanApiDto } from "@/lib/types";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/platform/coupons")({
  component: () => <CouponsPage />,
});

function toRow(c: CouponApiDto): Row {
  return {
    id: String(c.id),
    code: c.code,
    discountPercent: `${c.discountPercent}%`,
    validFrom: c.validFrom ?? "",
    validTo: c.validTo ?? "",
    planCodes: c.planCodes.join(", "),
    usageCount: c.usageCount,
    active: c.active ? "Active" : "Inactive",
  };
}

function toCreateBody(values: Record<string, string>) {
  return {
    code: values["code"],
    discountPercent: Number((values["discountPercent"] ?? "0").replace("%", "")),
    validFrom: values["validFrom"] || null,
    validTo: values["validTo"] || null,
    planCodes: (values["planCodes"] ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
  };
}

function toUpdateBody(values: Record<string, string>) {
  return {
    discountPercent: Number((values["discountPercent"] ?? "0").replace("%", "")),
    validFrom: values["validFrom"] || null,
    validTo: values["validTo"] || null,
    planCodes: (values["planCodes"] ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
    active: values["active"] === "Active",
  };
}

function ShareCouponDialog({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setRecipientName("");
    setRecipientEmail("");
    setError(null);
  }, [row]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    if (!recipientName.trim() || !recipientEmail.trim()) {
      setError("Both name and email are required.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await apiFetch(`/api/platform/coupons/${row.id}/share`, {
        method: "POST",
        data: { recipientName: recipientName.trim(), recipientEmail: recipientEmail.trim() },
      });
      toast.success(`Coupon ${row["code"]} shared with ${recipientName.trim()}`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't share this coupon.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share coupon {row?.["code"]}</DialogTitle>
          <DialogDescription>
            Emails the code, discount and validity to whoever you send it to.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="space-y-1.5">
            <Label>
              Recipient name<span className="ml-1 font-bold text-destructive">*</span>
            </Label>
            <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>
              Recipient email<span className="ml-1 font-bold text-destructive">*</span>
            </Label>
            <Input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : "Share"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CouponsPage() {
  const [planCodes, setPlanCodes] = useState<string[]>([]);
  const [sharingRow, setSharingRow] = useState<Row | null>(null);

  useEffect(() => {
    apiFetch<PlanApiDto[]>("/api/platform/plans")
      .then((plans) => setPlanCodes(plans.map((p) => p.code)))
      .catch(() => setPlanCodes([]));
  }, []);

  const columns = useMemo(
    () => [
      col("code", "Code", "code", { required: true }),
      col("discountPercent", "Discount %", "percent", { required: true }),
      col("validFrom", "Valid From", "date"),
      col("validTo", "Valid Until", "date"),
      col("planCodes", "Applicable Plans", "badge", {
        multiple: true,
        options: planCodes,
        secondary: true,
      }),
      col("usageCount", "Redemptions", "number", { formHidden: true }),
      col("active", "Status", "badge", { options: ["Active", "Inactive"] }),
    ],
    [planCodes],
  );

  return (
    <>
      <RealModulePage<CouponApiDto>
        path="platform/coupons"
        basePath="/api/platform/coupons"
        columns={columns}
        toRow={toRow}
        toCreateBody={toCreateBody}
        toUpdateBody={toUpdateBody}
        rowActions={(row) => [
          {
            label: "Share via email",
            icon: <Mail className="h-4 w-4" />,
            onClick: () => setSharingRow(row),
          },
        ]}
      />
      <ShareCouponDialog row={sharingRow} onClose={() => setSharingRow(null)} />
    </>
  );
}
