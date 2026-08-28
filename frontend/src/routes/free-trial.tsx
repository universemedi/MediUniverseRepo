import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { FormBuilder } from "@/components/form/FormBuilder";
import { col } from "@/config/types";
import { planByCode } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

const FIELDS = [
  col("organization", "Organization name", "org", {
    required: true,
    placeholder: "Nair Family Clinic",
  }),
  col("orgType", "Organization type", "badge", {
    required: true,
    fieldType: "select",
    options: [
      "Single clinic",
      "Multi-branch group",
      "Hospital / polyclinic",
      "Pharmacy",
      "Diagnostic laboratory",
    ],
  }),
  col("adminName", "Admin full name", "name", { required: true, placeholder: "Dr. Kavya Nair" }),
  col("email", "Work email", "email", {
    required: true,
    fieldType: "email",
    placeholder: "you@clinic.com",
  }),
  col("phone", "Phone", "phone", {
    required: true,
    fieldType: "phone",
    placeholder: "+91 98765 43210",
  }),
  col("city", "City", "city", { required: true, placeholder: "Kochi" }),
  col("subdomain", "Preferred subdomain", "code", {
    required: true,
    placeholder: "nairclinic",
    help: "Your workspace will be available at subdomain.mediunivers.io",
  }),
  col("size", "Team size", "badge", {
    required: true,
    fieldType: "select",
    options: ["1 – 5", "6 – 15", "16 – 50", "51 – 200", "200+"],
  }),
];

function TrialPage() {
  const [done, setDone] = useState(false);
  const trial = planByCode("TRIAL");

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Free trial"
        title="Start your 14-day trial workspace"
        subtitle="No card required. Your trial includes the clinic module for one branch and up to five users."
      />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 lg:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit p-6">
          <h2 className="text-sm font-semibold text-foreground">{trial.name}</h2>
          <p className="mt-1 text-2xl font-semibold text-primary">{trial.price}</p>
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

        <Card className="p-6">
          {done ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-3 text-lg font-semibold text-foreground">
                Trial workspace is being created
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We have emailed the admin sign-in link. You can explore the console with a demo role
                right now.
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
                Fields marked * are required.
              </p>
              <FormBuilder
                columns={FIELDS}
                submitLabel="Start free trial"
                onSubmit={() => {
                  setDone(true);
                  toast.success("Trial created", {
                    description: "Check your inbox for the admin sign-in link.",
                  });
                }}
              />
            </>
          )}
        </Card>
      </section>
    </SiteLayout>
  );
}
