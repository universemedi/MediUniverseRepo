import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { FormBuilder } from "@/components/form/FormBuilder";
import { col } from "@/config/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/request-demo")({
  head: () => ({
    meta: [
      { title: "Request a Demo — MediUnivers Healthcare Platform" },
      {
        name: "description",
        content:
          "Book a guided MediUnivers demo. Tell us about your clinic, pharmacy or lab and our sales team will tailor the walkthrough to your workflows.",
      },
      { property: "og:title", content: "Request a MediUnivers Demo" },
      {
        property: "og:description",
        content: "See the clinic, pharmacy, lab, CRM and CMS modules live.",
      },
    ],
  }),
  component: DemoPage,
});

const FIELDS = [
  col("name", "Full name", "name", { required: true, placeholder: "Dr. Kavya Nair" }),
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
  col("city", "City", "city", { required: true, placeholder: "Bengaluru" }),
  col("branches", "Number of branches", "number", {
    required: true,
    fieldType: "number",
    placeholder: "2",
  }),
  col("users", "Expected users", "number", {
    required: true,
    fieldType: "number",
    placeholder: "15",
  }),
  col("modules", "Primary interest", "badge", {
    required: true,
    fieldType: "select",
    options: ["Clinic", "Pharmacy", "Laboratory", "Patient CRM", "Website & CMS", "Everything"],
  }),
  col("preferredDate", "Preferred demo date", "date", { required: true, fieldType: "date" }),
  col("notes", "Anything we should prepare?", "text", {
    fieldType: "textarea",
    placeholder: "Current software, pain points, must-have workflows…",
  }),
];

function DemoPage() {
  const [done, setDone] = useState(false);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Request a demo"
        title="See MediUnivers with your own workflows"
        subtitle="A product specialist walks your team through the modules you care about, then sets up a trial workspace."
      />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Card className="p-6">
          {done ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-3 text-lg font-semibold text-foreground">Demo request received</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Our sales team will confirm your slot by email. You can also start a free trial
                right away.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/free-trial">Start free trial</Link>
                </Button>
                <Button variant="outline" onClick={() => setDone(false)}>
                  Submit another request
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground">
                Tell us about your organization
              </h2>
              <p className="mt-1 mb-5 text-sm text-muted-foreground">
                We use this to pick the right modules and plan for your demo. Fields marked * are
                required.
              </p>
              <FormBuilder
                columns={FIELDS}
                submitLabel="Request demo"
                onSubmit={() => {
                  setDone(true);
                  toast.success("Demo requested", {
                    description: "Our sales team will contact you shortly.",
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
