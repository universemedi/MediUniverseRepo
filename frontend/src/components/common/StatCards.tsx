import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { StatDef } from "@/config/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCards({ stats, loading }: { stats: StatDef[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-3 h-3 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const up = s.trend !== "down";
        return (
          <Card
            key={s.label}
            className="relative overflow-hidden p-5 transition-shadow hover:shadow-md"
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10"
              style={{ background: "var(--primary)" }}
            />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{s.value}</p>
            {s.delta ? (
              <p
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  up ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                )}
              >
                {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {s.delta}
              </p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
