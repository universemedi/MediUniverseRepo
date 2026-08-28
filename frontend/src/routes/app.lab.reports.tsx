import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileBarChart, Lock, Printer, ShieldAlert } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportsSearch {
  orderId?: number | undefined;
}

export const Route = createFileRoute("/app/lab/reports")({
  validateSearch: (search: Record<string, unknown>): ReportsSearch => ({
    orderId: typeof search["orderId"] === "number" ? (search["orderId"] as number) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Lab Reports — MediUnivers Laboratory" },
      { name: "description", content: "Verified lab reports, ready to view or print." },
    ],
  }),
  component: ReportsPage,
});

interface OrderSummary {
  id: number;
  orderNumber: string;
  status: string;
  patient: { name: string; patientNumber: string };
}
interface ReportItem {
  testName: string;
  sampleType: string;
  result: {
    resultValue: string;
    unit: string | null;
    flag: string;
    remarks: string | null;
    verifiedByName: string | null;
  } | null;
}
interface Report {
  orderId: number;
  orderNumber: string;
  organizationName: string;
  patient: { name: string; patientNumber: string; phone: string | null };
  doctorName: string | null;
  items: ReportItem[];
  reportedAt: string;
}

const FLAG_STYLE: Record<string, string> = {
  LOW: "border-blue-300 bg-blue-50 text-blue-700",
  NORMAL: "border-emerald-300 bg-emerald-50 text-emerald-700",
  HIGH: "border-amber-300 bg-amber-50 text-amber-700",
  CRITICAL: "border-destructive/25 bg-destructive/10 text-destructive",
  UNKNOWN: "text-muted-foreground",
};

function ReportsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const { orderId } = Route.useSearch();
  const unavailable = !isPlatform && isUnavailable("lab");

  const [verifiedOrders, setVerifiedOrders] = useState<OrderSummary[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function loadList() {
    if (isPlatform || unavailable) return;
    apiFetch<OrderSummary[]>("/api/lab/orders?status=VERIFIED,COMPLETED")
      .then(setVerifiedOrders)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load verified orders."),
      );
  }
  useEffect(loadList, [isPlatform, unavailable]);

  useEffect(() => {
    if (orderId) {
      apiFetch<Report>(`/api/lab/reports/${orderId}`)
        .then(setReport)
        .catch((err) =>
          setLoadError(err instanceof ApiError ? err.message : "Couldn't load this report."),
        );
    }
  }, [orderId]);

  if (isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Organization area</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }
  if (unavailable) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Laboratory isn't part of this organization</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app/$" params={{ _splat: "org/modules" }}>
            Configure modules
          </Link>
        </Button>
      </Card>
    );
  }

  if (report) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button asChild variant="outline">
            <Link to="/app/lab/reports">Back to reports</Link>
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>

        <Card className="space-y-6 p-8">
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <p className="text-lg font-semibold">{report.organizationName}</p>
              <p className="text-xs text-muted-foreground">Laboratory Report</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{report.orderNumber}</p>
              <p>{new Date(report.reportedAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Patient</p>
              <p>
                {report.patient.name} · {report.patient.patientNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Referring doctor</p>
              <p>{report.doctorName ? `Dr. ${report.doctorName}` : "Direct booking"}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Test</th>
                <th className="py-2">Result</th>
                <th className="py-2">Unit</th>
                <th className="py-2">Flag</th>
                <th className="py-2">Verified by</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2">{item.testName}</td>
                  <td className="py-2">{item.result?.resultValue ?? "—"}</td>
                  <td className="py-2">{item.result?.unit ?? ""}</td>
                  <td className="py-2">
                    {item.result ? (
                      <Badge variant="outline" className={FLAG_STYLE[item.result.flag] ?? ""}>
                        {item.result.flag}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {item.result?.verifiedByName ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lab Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Available once every result on an order is verified.
        </p>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !verifiedOrders ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : verifiedOrders.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <FileBarChart className="mx-auto mb-2 h-6 w-6" /> No verified reports yet.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {verifiedOrders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {o.orderNumber} · {o.patient.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{o.patient.patientNumber}</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/lab/reports" search={{ orderId: o.id }}>
                  View report
                </Link>
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
