import { createFileRoute, Link } from "@tanstack/react-router";
import { Construction, Lock, ShieldAlert } from "lucide-react";
import { moduleByPath } from "@/config/modules";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/app/$")({
  component: ModulePage,
});

function Shell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mx-auto max-w-md p-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <h1 className="mt-4 text-lg font-semibold">{title}</h1>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </Card>
  );
}

/** Only reached for a path with no dedicated route file — either a mistyped/stale link, or a module added to config/modules.ts without a screen built for it yet. Never renders fake data. */
function ModulePage() {
  const { _splat } = Route.useParams();
  const path = (_splat ?? "").replace(/\/$/, "");
  const mod = moduleByPath(path);
  const { reasonForPath, plan } = usePermissions();

  if (!mod) {
    return (
      <Shell icon={<ShieldAlert className="h-5 w-5" />} title="Page not found">
        <p>No module is registered at /app/{path}.</p>
        <Button asChild className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Shell>
    );
  }

  const reason = reasonForPath(mod.path);

  if (reason === "unavailable") {
    return (
      <Shell
        icon={<ShieldAlert className="h-5 w-5" />}
        title={`${mod.title} isn't part of this organization`}
      >
        <p>Your organization's business type doesn't include {mod.title.toLowerCase()}.</p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Shell>
    );
  }

  if (reason === "plan") {
    return (
      <Shell icon={<Lock className="h-5 w-5" />} title={`${mod.title} is not in your plan`}>
        <p>
          Your organization is on the <strong>{plan.name}</strong> plan, which doesn't include{" "}
          {mod.title}.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Shell>
    );
  }

  if (reason !== "ok") {
    return (
      <Shell icon={<ShieldAlert className="h-5 w-5 text-destructive" />} title="Access restricted">
        <p>
          {reason === "portal"
            ? "This area belongs to the MediUnivers product-owner console and is not part of your workspace."
            : `Your role does not have permission to open ${mod.title}.`}
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Shell>
    );
  }

  return (
    <Shell icon={<Construction className="h-5 w-5" />} title={`${mod.title} isn't built yet`}>
      <p>This module is registered but doesn't have a screen yet.</p>
      <Button asChild variant="outline" className="mt-5">
        <Link to="/app">Back to dashboard</Link>
      </Button>
    </Shell>
  );
}
