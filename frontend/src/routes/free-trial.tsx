import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { FormBuilder, type FormValues } from "@/components/form/FormBuilder";
import { col, type ColumnDef } from "@/config/types";
import { apiFetchPublic } from "@/lib/api";
import type { OrgTypeApiDto, PlanApiDto } from "@/lib/types";
import { fetchIndiaCities, useIndiaStates } from "@/lib/indiaLocations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/free-trial")({
  head: () => ({
    meta: [
      { title: "Start a 14-Day Free Trial — MediUnivers" },
      {
        name: "description",
        content:
          "Create a MediUnivers trial workspace in minutes. Run appointments, queue and billing for 14 days with no card required.",
      },
      { property: "og:title", content: "Start a Free Trial — MediUnivers" },
      {
        property: "og:description",
        content: "14 days of the MediUnivers clinic module, no card required.",
      },
    ],
  }),
  component: TrialPage,
});

function buildFields(orgTypes: OrgTypeApiDto[], states: string[]): ColumnDef[] {
  return [
    col("organizationName", "Organization name", "org", {
      required: true,
      placeholder: "Nair Family Clinic",
    }),
    col("orgType", "Organization type", "badge", {
      required: true,
      fieldType: "select",
      options: orgTypes.map((t) => t.name),
    }),
    col("headBranchName", "Head office / main branch name", "text", {
      required: true,
      placeholder: "Head Office",
    }),
    col("ownerFullName", "Your full name", "name", {
      required: true,
      placeholder: "Dr. Kavya Nair",
    }),
    col("ownerEmail", "Work email (used to sign in)", "email", {
      required: true,
      fieldType: "email",
      placeholder: "you@clinic.com",
    }),
    col("phone", "Phone", "phone", {
      required: true,
      fieldType: "phone",
      placeholder: "+91 98765 43210",
    }),
    col("state", "State", "badge", { required: true, options: states }),
    col("city", "City", "badge", {
      required: true,
      dependsOn: "state",
      optionsFor: (state) => fetchIndiaCities(state),
    }),
    col("subdomain", "Preferred subdomain", "code", {
      placeholder: "nairclinic",
      help: "Your workspace will be available at subdomain.mediunivers.io",
    }),
  ];
}

async function submitFreeTrial(values: FormValues, orgTypes: OrgTypeApiDto[]) {
  const orgType = orgTypes.find((t) => t.name === values["orgType"]);
  await apiFetchPublic("/api/public/organizations/free-trial", {
    method: "POST",
    data: {
      organizationName: values["organizationName"],
      subdomain: values["subdomain"] || null,
      orgTypeCode: orgType?.code ?? orgTypes[0]?.code ?? "CLINIC_ONLY",
      phone: values["phone"],
      city: values["city"],
      state: values["state"] || null,
      country: "India",
      headBranchName: values["headBranchName"],
      ownerFullName: values["ownerFullName"],
      ownerEmail: values["ownerEmail"],
    },
  });
}

function TrialPage() {
  const [done, setDone] = useState(false);
  const [trial, setTrial] = useState<PlanApiDto | null>(null);
  const [orgTypes, setOrgTypes] = useState<OrgTypeApiDto[] | null>(null);
  const [orgTypesError, setOrgTypesError] = useState<string | null>(null);

  useEffect(() => {
    apiFetchPublic<PlanApiDto[]>("/api/public/plans")
      .then((plans) => setTrial(plans.find((p) => p.freeTrial) ?? null))
      .catch(() => setTrial(null));
    apiFetchPublic<OrgTypeApiDto[]>("/api/public/org-types")
      .then(setOrgTypes)
      .catch(() =>
        setOrgTypesError("Couldn't load organization types. Please refresh and try again."),
      );
  }, []);

  const states = useIndiaStates();
  const fields = useMemo(() => buildFields(orgTypes ?? [], states), [orgTypes, states]);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Free trial"
        title="Start your 14-day trial workspace"
        subtitle="No card required. Your trial includes the clinic module for one branch and up to five users."
      />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 lg:grid-cols-[1fr_1.4fr]">
        {!trial ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : (
          <Card className="h-fit p-6">
            <h2 className="text-sm font-semibold text-foreground">{trial.name}</h2>
            <p className="mt-1 text-2xl font-semibold text-primary">
              Free / {trial.freeTrialDays} days
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {[
                ...trial.highlights,
                "Patient portal included",
                "Upgrade any time without losing data",
              ].map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {h}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-muted-foreground">
              Need pharmacy, lab, CRM or the website builder during the trial?{" "}
              <Link to="/request-demo" className="text-primary underline-offset-2 hover:underline">
                Ask our sales team
              </Link>
              .
            </p>
          </Card>
        )}

        <Card className="p-6">
          {done ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-3 text-lg font-semibold text-foreground">
                Trial workspace created
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We've emailed you a link to set your password. Once you've set it, sign in to get
                started.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/login">Go to sign in</Link>
                </Button>
                <Button variant="outline" onClick={() => setDone(false)}>
                  Create another workspace
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground">Create your workspace</h2>
              <p className="mt-1 mb-5 text-sm text-muted-foreground">
                Fields marked <span className="font-bold text-destructive">*</span> are required.
              </p>
              {orgTypesError ? (
                <p className="text-sm text-destructive">{orgTypesError}</p>
              ) : !orgTypes ? (
                <Skeleton className="h-64 rounded-xl" />
              ) : (
                <FormBuilder
                  columns={fields}
                  submitLabel="Start free trial"
                  onSubmit={async (values) => {
                    await submitFreeTrial(values, orgTypes);
                    setDone(true);
                    toast.success("Trial workspace created", {
                      description: "Check your inbox for the sign-in link.",
                    });
                  }}
                />
              )}
            </>
          )}
        </Card>
      </section>
    </SiteLayout>
  );
}
