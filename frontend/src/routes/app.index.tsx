import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MODULES } from "@/config/modules";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store";
import { apiFetch } from "@/lib/api";
import type {
  PlatformDashboardApiDto,
  ClinicDashboardApiDto,
  PharmacyDashboardApiDto,
  LabDashboardApiDto,
  BillingDashboardApiDto,
  ChartRow,
} from "@/lib/types";
import type { ChartDef, StatDef } from "@/config/types";
import { StatCards } from "@/components/common/StatCards";
import { ChartCard } from "@/components/common/ChartCard";
import { WebsiteSetupBanner } from "@/components/layout/WebsiteSetupBanner";
import { Icon } from "@/components/common/Icon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NAV_SECTIONS, moduleLinkProps } from "@/config/nav";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function currency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Real period-over-period comparison — omitted (no badge shown) when there's no prior baseline to compare against. */
function percentDelta(current: number, previous: number): Pick<StatDef, "delta" | "trend"> {
  if (previous <= 0) return {};
  const pct = ((current - previous) / previous) * 100;
  return { delta: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, trend: pct >= 0 ? "up" : "down" };
}

function Dashboard() {
  const { canAccessPath, roleName, isPlatform, plan, orgType, orgName, reasonForPath, portal } =
    usePermissions();
  const user = useAppSelector((s) => s.auth.user);
  const sections = NAV_SECTIONS.filter((s) => s.portal === portal)
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => reasonForPath(i.path) === "ok"),
    }))
    .filter((s) => s.items.length);

  const [platformDashboard, setPlatformDashboard] = useState<PlatformDashboardApiDto | null>(null);

  useEffect(() => {
    if (!isPlatform) return;
    apiFetch<PlatformDashboardApiDto>("/api/platform/dashboard")
      .then(setPlatformDashboard)
      .catch(() => setPlatformDashboard(null));
  }, [isPlatform]);

  // A clinic-only org's plan never includes pharmacy/lab, and vice versa — both the
  // organization's business type AND its paid plan must allow a module before we
  // ask its dashboard for numbers (matches AccessService.requireModuleEnabled).
  const hasClinic = orgType.modules.includes("clinic") && plan.modules.includes("clinic");
  const hasPharmacy = orgType.modules.includes("pharmacy") && plan.modules.includes("pharmacy");
  const hasLab = orgType.modules.includes("lab") && plan.modules.includes("lab");

  const [clinicDashboard, setClinicDashboard] = useState<ClinicDashboardApiDto | null>(null);
  const [pharmacyDashboard, setPharmacyDashboard] = useState<PharmacyDashboardApiDto | null>(null);
  const [labDashboard, setLabDashboard] = useState<LabDashboardApiDto | null>(null);
  const [billingDashboard, setBillingDashboard] = useState<BillingDashboardApiDto | null>(null);
  const [tenantLoaded, setTenantLoaded] = useState(false);

  useEffect(() => {
    if (isPlatform) return;
    setTenantLoaded(false);
    Promise.all([
      apiFetch<BillingDashboardApiDto>("/api/billing/dashboard").catch(() => null),
      hasClinic
        ? apiFetch<ClinicDashboardApiDto>("/api/clinic/dashboard").catch(() => null)
        : Promise.resolve(null),
      hasPharmacy
        ? apiFetch<PharmacyDashboardApiDto>("/api/pharmacy/dashboard").catch(() => null)
        : Promise.resolve(null),
      hasLab
        ? apiFetch<LabDashboardApiDto>("/api/lab/dashboard").catch(() => null)
        : Promise.resolve(null),
    ]).then(([billing, clinic, pharmacy, lab]) => {
      setBillingDashboard(billing);
      setClinicDashboard(clinic);
      setPharmacyDashboard(pharmacy);
      setLabDashboard(lab);
      setTenantLoaded(true);
    });
  }, [isPlatform, hasClinic, hasPharmacy, hasLab]);

  const statsLoading = isPlatform ? !platformDashboard : !tenantLoaded;

  const stats: StatDef[] = useMemo(() => {
    if (isPlatform) {
      if (!platformDashboard) return [];
      const s = platformDashboard.stats;
      const list: StatDef[] = [
        {
          label: "Active organizations",
          value: String(s.activeOrganizations),
          ...(s.newOrganizationsLast30Days > 0
            ? { delta: `+${s.newOrganizationsLast30Days} new (30d)`, trend: "up" as const }
            : {}),
        },
        {
          label: "Demo requests",
          value: String(s.openDemoRequests),
          ...(s.newDemoRequestsLast30Days > 0
            ? { delta: `+${s.newDemoRequestsLast30Days} new (30d)`, trend: "up" as const }
            : {}),
        },
        {
          label: "Expiring within 30 days",
          value: String(s.organizationsExpiringWithin30Days),
        },
        {
          label: "Demo → live conversion",
          value:
            s.demoConversionRatePercent != null
              ? `${s.demoConversionRatePercent.toFixed(0)}%`
              : "—",
        },
      ];
      if (s.revenueVisible) {
        list.push({
          label: "Subscription revenue (this month)",
          value: currency(s.subscriptionRevenueThisMonth ?? 0),
          ...percentDelta(s.subscriptionRevenueThisMonth ?? 0, s.subscriptionRevenueLastMonth ?? 0),
        });
      }
      return list;
    }
    const list: StatDef[] = [];
    if (hasClinic && clinicDashboard) {
      list.push({ label: "Appointments today", value: String(clinicDashboard.todaysAppointments) });
      list.push({
        label: "Patients in queue",
        value: String(clinicDashboard.checkedIn + clinicDashboard.inConsultation),
      });
    }
    if (billingDashboard) {
      list.push({
        label: "Today's collection",
        value: currency(billingDashboard.todaysCollections),
      });
    }
    if (hasLab && labDashboard) {
      list.push({
        label: "Pending lab results",
        value: String(
          labDashboard.pendingCollection +
            labDashboard.pendingResults +
            labDashboard.pendingVerification,
        ),
      });
    }
    if (hasPharmacy && pharmacyDashboard && list.length < 4) {
      list.push({
        label: "Pharmacy sales today",
        value: String(pharmacyDashboard.todaysSalesCount),
        delta: `${currency(pharmacyDashboard.todaysRevenue)} revenue`,
        trend: "up",
      });
    }
    return list.slice(0, 4);
  }, [
    isPlatform,
    platformDashboard,
    hasClinic,
    hasPharmacy,
    hasLab,
    clinicDashboard,
    pharmacyDashboard,
    labDashboard,
    billingDashboard,
  ]);

  const chartsWithData: { def: ChartDef; data: ChartRow[] }[] = useMemo(() => {
    if (isPlatform) {
      if (!platformDashboard) return [];
      const modulePopularity = platformDashboard.modulePopularity;
      const demoConversion = platformDashboard.demoConversionTrend;
      const subscriptionTypes = platformDashboard.subscriptionTypeMix;
      const result: { def: ChartDef; data: ChartRow[] }[] = [
        {
          def: {
            type: "bar",
            title: "Modules organizations have selected",
            dataKeys: ["Organizations"],
            categories: modulePopularity.map((r) => r.name),
          },
          data: modulePopularity,
        },
        {
          def: {
            type: "bar",
            title: "Demo requests converting to live",
            dataKeys: ["Demo requests", "Converted to live"],
            categories: demoConversion.map((r) => r.name),
          },
          data: demoConversion,
        },
      ];
      if (subscriptionTypes.length) {
        result.push({
          def: {
            type: "pie",
            title: "Overall subscription types",
            dataKeys: ["Organizations"],
            categories: subscriptionTypes.map((r) => r.name),
          },
          data: subscriptionTypes,
        });
      }
      if (
        platformDashboard.stats.revenueVisible &&
        platformDashboard.subscriptionRevenueTrend.length
      ) {
        result.push({
          def: {
            type: "area",
            title: "Subscription revenue trend",
            dataKeys: ["Revenue"],
            categories: platformDashboard.subscriptionRevenueTrend.map((r) => r.name),
          },
          data: platformDashboard.subscriptionRevenueTrend,
        });
      }
      return result;
    }

    const result: { def: ChartDef; data: ChartRow[] }[] = [];
    if (hasClinic && clinicDashboard) {
      const data: ChartRow[] = [
        { name: "Checked-in", Count: clinicDashboard.checkedIn },
        { name: "In consultation", Count: clinicDashboard.inConsultation },
        { name: "Completed", Count: clinicDashboard.completedToday },
      ];
      result.push({
        def: {
          type: "pie",
          title: "Today's appointment status",
          dataKeys: ["Count"],
          categories: data.map((r) => r.name),
        },
        data,
      });
    }
    if (hasLab && labDashboard) {
      const data: ChartRow[] = [
        { name: "Awaiting sample", Count: labDashboard.pendingCollection },
        { name: "Processing", Count: labDashboard.pendingResults },
        { name: "Awaiting verification", Count: labDashboard.pendingVerification },
        { name: "Completed", Count: labDashboard.completedReports },
        { name: "Rejected", Count: labDashboard.rejectedSamples },
      ];
      result.push({
        def: {
          type: "bar",
          title: "Lab order pipeline",
          dataKeys: ["Count"],
          categories: data.map((r) => r.name),
        },
        data,
      });
    }
    if (hasPharmacy && pharmacyDashboard) {
      const data: ChartRow[] = [
        { name: "Low stock", Count: pharmacyDashboard.lowStockCount },
        { name: "Expiring soon", Count: pharmacyDashboard.expiringSoonCount },
        { name: "Pending prescriptions", Count: pharmacyDashboard.pendingPrescriptions },
      ];
      result.push({
        def: {
          type: "bar",
          title: "Pharmacy stock health",
          dataKeys: ["Count"],
          categories: data.map((r) => r.name),
        },
        data,
      });
    }
    return result;
  }, [
    isPlatform,
    platformDashboard,
    hasClinic,
    hasPharmacy,
    hasLab,
    clinicDashboard,
    pharmacyDashboard,
    labDashboard,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back, {user?.name?.split(" ").slice(-1)[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {roleName} · {isPlatform ? "MediUnivers Platform" : `${orgName} · ${user?.branch}`}
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/25 bg-primary/10 text-primary">
          {MODULES.filter((m) => canAccessPath(m.path)).length} pages ·{" "}
          {isPlatform ? "Platform access" : `${plan.name} plan`}
        </Badge>
      </div>

      {!isPlatform ? <WebsiteSetupBanner /> : null}

      <StatCards stats={stats} loading={statsLoading} />

      {isPlatform ? (
        <Card className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Organizations expiring within 30 days
          </h2>
          {statsLoading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : !platformDashboard || platformDashboard.organizationsExpiringSoon.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No organizations renewing in the next 30 days.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {platformDashboard.organizationsExpiringSoon.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{o.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.planName ?? "No plan"} · renews {o.renewsOn}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      o.daysLeft <= 7
                        ? "shrink-0 border-destructive/25 bg-destructive/10 text-destructive"
                        : "shrink-0 border-amber-300 bg-amber-50 text-amber-700"
                    }
                  >
                    {o.daysLeft <= 0 ? "Today" : `${o.daysLeft}d left`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{plan.name} subscription</h2>
              <p className="text-xs text-muted-foreground">{plan.tagline}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-border bg-muted/50 text-foreground">
                {orgType.name}
              </Badge>
              <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
                {plan.limits.branches} branches · {plan.limits.users} users · {plan.limits.storage}
              </Badge>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {orgType.modules
              .filter((g): g is "clinic" | "pharmacy" | "lab" | "crm" | "cms" =>
                (["clinic", "pharmacy", "lab", "crm", "cms"] as const).includes(g as never),
              )
              .map((g) => {
                const unlocked = plan.modules.includes(g);
                return (
                  <span
                    key={g}
                    className={
                      unlocked
                        ? "rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary"
                        : "rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium capitalize text-muted-foreground"
                    }
                  >
                    {g}
                    {unlocked ? "" : " · needs a higher plan"}
                  </span>
                );
              })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Only modules {orgType.name} actually runs are listed here — a clinic-only organization
            will never see Pharmacy or Laboratory, regardless of plan.
          </p>
        </Card>
      )}

      {chartsWithData.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {chartsWithData.map(({ def, data }) => (
            <ChartCard
              key={def.title}
              def={def}
              data={data}
              seedKey="dashboard"
              loading={statsLoading}
            />
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your workspaces
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((s) => (
            <Card key={s.group} className="p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name={s.icon} className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold">{s.label}</h3>
              </div>
              <ul className="mt-3 space-y-1">
                {s.items.slice(0, 5).map((i) => (
                  <li key={i.to}>
                    <Link
                      {...moduleLinkProps(i.path)}
                      className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {i.label}
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
