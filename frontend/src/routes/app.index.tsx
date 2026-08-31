import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MODULES } from "@/config/modules";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store";
import { apiFetch } from "@/lib/api";
import type { LeadApiDto, SubscriptionApiDto } from "@/lib/types";
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

const STATS = [
  { label: "Active organizations", value: "482", delta: "+8.2%", trend: "up" as const },
  { label: "Appointments today", value: "1,284", delta: "+4.6%", trend: "up" as const },
  { label: "Pharmacy revenue", value: "₹ 8.4L", delta: "+12.1%", trend: "up" as const },
  { label: "Pending lab results", value: "97", delta: "-6.3%", trend: "down" as const },
];

const CHARTS = [
  {
    type: "area" as const,
    title: "Appointments & revenue trend",
    dataKeys: ["Appointments", "Revenue"],
    categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
  },
  {
    type: "bar" as const,
    title: "Module usage by organization type",
    dataKeys: ["Clinic", "Pharmacy", "Laboratory"],
    categories: ["Starter", "Professional", "Enterprise", "Custom"],
  },
  {
    type: "pie" as const,
    title: "Subscription mix",
    dataKeys: ["Organizations"],
    categories: ["Starter", "Professional", "Enterprise", "Custom"],
  },
  {
    type: "line" as const,
    title: "Onboarding funnel velocity",
    dataKeys: ["Leads", "Trials", "Live"],
    categories: ["W1", "W2", "W3", "W4", "W5", "W6"],
  },
];

const TENANT_STATS = [
  { label: "Appointments today", value: "184", delta: "+6.2%", trend: "up" as const },
  { label: "Patients in queue", value: "23", delta: "-3.1%", trend: "down" as const },
  { label: "Today's collection", value: "₹ 1.9L", delta: "+9.4%", trend: "up" as const },
  { label: "Pending lab results", value: "17", delta: "-4.0%", trend: "down" as const },
];

const TENANT_CHARTS = [
  {
    type: "area" as const,
    title: "Appointments & revenue trend",
    dataKeys: ["Appointments", "Revenue"],
    categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  {
    type: "bar" as const,
    title: "Department load",
    dataKeys: ["Consultations"],
    categories: ["General", "Cardio", "Ortho", "Pediatrics", "Derma"],
  },
];

function Dashboard() {
  const { canAccessPath, roleName, isPlatform, plan, orgType, orgName, reasonForPath } =
    usePermissions();
  const user = useAppSelector((s) => s.auth.user);
  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => reasonForPath(i.path) === "ok"),
  })).filter((s) => s.items.length);
  const stats = isPlatform ? STATS : TENANT_STATS;
  const charts = isPlatform ? CHARTS : TENANT_CHARTS;

  const [leads, setLeads] = useState<LeadApiDto[] | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionApiDto[] | null>(null);
  const [trials, setTrials] = useState<SubscriptionApiDto[] | null>(null);

  useEffect(() => {
    if (!isPlatform) return;
    Promise.all([
      apiFetch<LeadApiDto[]>("/api/platform/leads"),
      apiFetch<SubscriptionApiDto[]>("/api/platform/subscriptions"),
      apiFetch<SubscriptionApiDto[]>("/api/platform/subscriptions/trials"),
    ])
      .then(([l, s, t]) => {
        setLeads(l);
        setSubscriptions(s);
        setTrials(t);
      })
      .catch(() => {
        setLeads([]);
        setSubscriptions([]);
        setTrials([]);
      });
  }, [isPlatform]);

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

      <StatCards stats={stats} />

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

      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((c) => (
          <ChartCard key={c.title} def={c} seedKey="dashboard" />
        ))}
      </div>

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
