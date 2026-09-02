import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileHeart, Printer } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAppSelector } from "@/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PrescriptionsSearch {
  id?: number | undefined;
}

export const Route = createFileRoute("/app/patient/prescriptions")({
  validateSearch: (search: Record<string, unknown>): PrescriptionsSearch => ({
    id: typeof search["id"] === "number" ? (search["id"] as number) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "My Prescriptions — MediUnivers" },
      { name: "description", content: "Prescriptions issued to you, ready to view or print." },
    ],
  }),
  component: MyPrescriptionsPage,
});

interface PrescriptionItem {
  medicineName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}
interface ConsultationApiDto {
  id: number;
  prescriptionNumber: string | null;
  pharmacyStatus: string;
  patient: { name: string; patientNumber: string };
  doctor: { fullName: string };
  prescriptionItems: PrescriptionItem[];
  diagnosis: string | null;
  followUpDate: string | null;
  startedAt: string;
  completedAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  NONE: "No Prescription",
  PENDING: "Issued",
  PARTIALLY_DISPENSED: "Partially Dispensed",
  DISPENSED: "Dispensed",
};
const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-700",
  PARTIALLY_DISPENSED: "border-amber-300 bg-amber-50 text-amber-700",
  DISPENSED: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

function rxCode(c: { id: number; prescriptionNumber: string | null }): string {
  return c.prescriptionNumber ?? `RX-${String(c.id).padStart(5, "0")}`;
}

function MyPrescriptionsPage() {
  const { id } = Route.useSearch();
  const orgName = useAppSelector((s) => s.tenant.orgName);

  const [list, setList] = useState<ConsultationApiDto[] | null>(null);
  const [detail, setDetail] = useState<ConsultationApiDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ConsultationApiDto[]>("/api/patient/prescriptions")
      .then(setList)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load your prescriptions."),
      );
  }, []);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    apiFetch<ConsultationApiDto>(`/api/patient/prescriptions/${id}`)
      .then(setDetail)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load this prescription."),
      );
  }, [id]);

  if (id && detail) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button asChild variant="outline">
            <Link to="/app/patient/prescriptions">Back to prescriptions</Link>
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>

        <Card className="space-y-6 p-8">
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <p className="text-lg font-semibold">{orgName || ""}</p>
              <p className="text-xs text-muted-foreground">Prescription</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{rxCode(detail)}</p>
              <p>{new Date(detail.completedAt ?? detail.startedAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Patient</p>
              <p>
                {detail.patient.name} · {detail.patient.patientNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prescribed by</p>
              <p>Dr. {detail.doctor.fullName}</p>
            </div>
            {detail.diagnosis ? (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Diagnosis</p>
                <p>{detail.diagnosis}</p>
              </div>
            ) : null}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Medicine</th>
                <th className="py-2">Dosage</th>
                <th className="py-2">Frequency</th>
                <th className="py-2">Duration</th>
                <th className="py-2">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {detail.prescriptionItems.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 font-medium">{item.medicineName}</td>
                  <td className="py-2">{item.dosage ?? "—"}</td>
                  <td className="py-2">{item.frequency ?? "—"}</td>
                  <td className="py-2">{item.duration ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">{item.instructions ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {detail.followUpDate ? (
            <p className="text-xs text-muted-foreground">
              Follow-up: {new Date(detail.followUpDate).toLocaleDateString()}
            </p>
          ) : null}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Prescriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every prescription your doctor has issued you.
        </p>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !list ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <FileHeart className="mx-auto mb-2 h-6 w-6" /> No prescriptions yet.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {list.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{rxCode(c)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Dr. {c.doctor.fullName} · {c.startedAt.slice(0, 10)} ·{" "}
                  {c.prescriptionItems.length} item(s)
                </p>
              </div>
              <Badge variant="outline" className={STATUS_STYLE[c.pharmacyStatus] ?? ""}>
                {STATUS_LABELS[c.pharmacyStatus] ?? c.pharmacyStatus}
              </Badge>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/patient/prescriptions" search={{ id: c.id }}>
                  View / Print
                </Link>
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
