import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MODULES } from "@/config/modules";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store";
import { apiFetch } from "@/lib/api";
import type {
  LeadApiDto,
  SubscriptionApiDto,
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

/** Real day-over-day comparison — omitted (no badge shown) when there's no prior-day baseline to compare against. */
function dayOverDayDelta(today: number, yesterday: number): Pick<StatDef, "delta" | "trend"> {
  if (yesterday <= 0) return {};
  const pct = ((today - yesterday) / yesterday) * 100;
  return { delta: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, trend: pct >= 0 ? "up" : "down" };
}

/** Six trailing 7-day windows, oldest first — used for the onboarding funnel chart. */
function weekBuckets(n: number) {
  const dayMs = 86_400_000;
  const now = Date.now();
  const buckets: { start: number; end: number; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const end = now - i * 7 * dayMs;
    const start = end - 7 * dayMs;
    buckets.push({ start, end, label: `W${n - i}` });
  }
  return buckets;
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

  const [leads, setLeads] = useState<LeadApiDto[] | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionApiDto[] | null>(null);
  const [trials, setTrials] = useState<SubscriptionApiDto[] | null>(null);
  const [platformDashboard, setPlatformDashboard] = useState<PlatformDashboardApiDto | null>(null);

  useEffect(() => {
    if (!isPlatform) return;
    Promise.all([
      apiFetch<LeadApiDto[]>("/api/platform/leads"),
      apiFetch<SubscriptionApiDto[]>("/api/platform/subscriptions"),
      apiFetch<SubscriptionApiDto[]>("/api/platform/subscriptions/trials"),
      apiFetch<PlatformDashboardApiDto>("/api/platform/dashboard"),
    ])
      .then(([l, s, t, d]) => {
        setLeads(l);
        setSubscriptions(s);
        setTrials(t);
        setPlatformDashboard(d);
      })
      .catch(() => {
        setLeads([]);
        setSubscriptions([]);
        setTrials([]);
        setPlatformDashboard(null);
      });
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

  const pipelineLoading = isPlatform && (!leads || !subscriptions || !trials);
  const demoLeads = (leads ?? []).filter((l) => l.source === "REQUEST_DEMO");
  const openDemoLeads = demoLeads.filter((l) => l.status !== "WON" && l.status !== "LOST");
  const newDemoLeads = demoLeads.filter((l) => l.status === "NEW_LEAD");
  const now = new Date();
  const expiringSoon = (trials ?? []).filter((t) => {
    if (!t.endDate) return false;
    const days = (new Date(t.endDate).getTime() - now.getTime()) / 86_400_000;
    return days <= 7;
  });
  const wonThisMonth = (leads ?? []).filter((l) => {
    if (l.status !== "WON") return false;
    const d = new Date(l.updatedAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const lapsedSubscriptions = (subscriptions ?? []).filter(
    (s) => s.status === "CANCELLED" || s.status === "EXPIRED",
  );

  const pipeline = [
    {
      stage: "Demo requests",
      count: String(openDemoLeads.length),
      note: `${newDemoLeads.length} awaiting first contact`,
    },
    {
      stage: "Active trials",
      count: String((trials ?? []).length),
      note: `${expiringSoon.length} expiring within 7 days`,
    },
    { stage: "Won this month", count: String(wonThisMonth.length), note: "Leads marked Won" },
    {
      stage: "Lapsed subscriptions",
      count: String(lapsedSubscriptions.length),
      note: "Cancelled or expired",
    },
  ];

  const activeSubscriptions = (subscriptions ?? []).filter((s) => s.status === "ACTIVE");
  const planCounts = new Map<string, number>();
  for (const s of activeSubscriptions) {
    planCounts.set(s.planName, (planCounts.get(s.planName) ?? 0) + 1);
  }
  const planMix = Array.from(planCounts.entries())
    .map(([name, orgs]) => ({
      name,
      orgs,
      share: activeSubscriptions.length ? Math.round((orgs / activeSubscriptions.length) * 100) : 0,
    }))
    .sort((a, b) => b.orgs - a.orgs);

  const statsLoading = isPlatform ? !platformDashboard : !tenantLoaded;

  const stats: StatDef[] = useMemo(() => {
    if (isPlatform) {
      if (!platformDashboard) return [];
      const s = platformDashboard.stats;
      return [
        {
          label: "Active organizations",
          value: String(s.activeOrganizations),
          ...(s.newOrganizationsLast30Days > 0
            ? { delta: `+${s.newOrganizationsLast30Days} new (30d)`, trend: "up" as const }
            : {}),
        },
        {
          label: "Appointments today",
          value: String(s.appointmentsToday),
          ...dayOverDayDelta(s.appointmentsToday, s.appointmentsYesterday),
        },
        {
          label: "Pharmacy revenue (today)",
          value: currency(s.pharmacyRevenueToday),
          ...dayOverDayDelta(s.pharmacyRevenueToday, s.pharmacyRevenueYesterday),
        },
        { label: "Pending lab results", value: String(s.pendingLabResults) },
      ];
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

  const funnelRows = useMemo<ChartRow[]>(() => {
    if (!isPlatform || !leads || !subscriptions || !trials) return [];
    return weekBuckets(6).map((b) => {
      const leadsCount = leads.filter((l) => {
        const t = new Date(l.createdAt).getTime();
        return t >= b.start && t < b.end;
      }).length;
      const trialsCount = trials.filter((s) => {
        const t = new Date(s.startDate).getTime();
        return t >= b.start && t < b.end;
      }).length;
      const liveCount = subscriptions.filter((s) => {
        if (s.freeTrial) return false;
        const t = new Date(s.startDate).getTime();
        return t >= b.start && t < b.end;
      }).length;
      return { name: b.label, Leads: leadsCount, Trials: trialsCount, Live: liveCount };
    });
  }, [isPlatform, leads, subscriptions, trials]);

  const chartsWithData: { def: ChartDef; data: ChartRow[] }[] = useMemo(() => {
    if (isPlatform) {
      if (!platformDashboard) return [];
      const trend = platformDashboard.appointmentsRevenueTrend;
      const byType = platformDashboard.organizationsByType;
      const subscriptionMix: ChartRow[] = planMix.map((p) => ({
        name: p.name,
        Organizations: p.orgs,
      }));
      const result: { def: ChartDef; data: ChartRow[] }[] = [
        {
          def: {
            type: "area",
            title: "Appointments & revenue trend",
            dataKeys: ["Appointments", "Revenue"],
            categories: trend.map((r) => r.name),
          },
          data: trend,
        },
        {
          def: {
            type: "bar",
            title: "Organizations by type",
            dataKeys: ["Organizations"],
            categories: byType.map((r) => r.name),
          },
          data: byType,
        },
      ];
      if (subscriptionMix.length) {
        result.push({
          def: {
            type: "pie",
            title: "Subscription mix",
            dataKeys: ["Organizations"],
            categories: subscriptionMix.map((r) => r.name),
          },
          data: subscriptionMix,
        });
      }
      result.push({
        def: {
          type: "line",
          title: "Onboarding funnel velocity",
          dataKeys: ["Leads", "Trials", "Live"],
          categories: funnelRows.map((r) => r.name),
        },
        data: funnelRows,
      });
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
    planMix,
    funnelRows,
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
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Demo → Trial → Subscription pipeline
            </h2>
            {pipelineLoading ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {pipeline.map((p) => (
                  <div key={p.stage} className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {p.stage}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{p.count}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{p.note}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Plan distribution
            </h2>
            {pipelineLoading ? (
              <Skeleton className="mt-4 h-32 rounded-xl" />
            ) : planMix.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No active subscriptions yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {planMix.map((p) => (
                  <li key={p.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{p.name}</span>
                      <span className="text-muted-foreground">{p.orgs} orgs</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${p.share}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
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
