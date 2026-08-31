import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, ShieldAlert } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/org/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding Checklist — MediUnivers Organization" },
      { name: "description", content: "How far your organization has gotten set up." },
    ],
  }),
  component: OnboardingPage,
});

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  done: boolean;
}

function OnboardingPage() {
  const { isPlatform } = usePermissions();
  const [steps, setSteps] = useState<OnboardingStep[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPlatform) return;
    apiFetch<OnboardingStep[]>("/api/org/onboarding")
      .then(setSteps)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load your checklist."),
      );
  }, [isPlatform]);

  if (isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Organization area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The onboarding checklist belongs to a subscribed organization, not the platform console.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  const doneCount = steps?.filter((s) => s.done).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Onboarding Checklist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {steps ? `${doneCount} of ${steps.length} steps done.` : "How far you've gotten set up."}
        </p>
      </div>

      {error ? (
        <Card className="p-4 text-sm text-destructive">{error}</Card>
      ) : !steps ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((s) => (
            <Card key={s.key} className="flex items-start gap-3 p-4">
              {s.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${s.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                >
                  {s.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
