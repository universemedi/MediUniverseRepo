import { createFileRoute, Link } from "@tanstack/react-router";
import { Quote, Star } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/testimonials")({
  head: () => ({
    meta: [
      { title: "Customer Stories & Testimonials | MediUnivers" },
      {
        name: "description",
        content:
          "Read how clinics, pharmacy chains and diagnostic labs run daily operations on MediUnivers — in their own words.",
      },
      { property: "og:title", content: "MediUnivers Testimonials" },
      {
        property: "og:description",
        content: "Customer stories from clinics, pharmacies and laboratories.",
      },
    ],
  }),
  component: TestimonialsPage,
});

const ITEMS = [
  {
    name: "Dr. Kavya Nair",
    role: "Founder, Nair Family Clinic",
    org: "Kochi",
    quote:
      "Reception, queue and billing finally live in one place. Our average patient wait dropped by 18 minutes.",
  },
  {
    name: "Rahul Shetty",
    role: "Operations Head, LifeCare Pharmacy",
    org: "Bengaluru",
    quote: "Batch and expiry alerts alone paid for the subscription in the first quarter.",
  },
  {
    name: "Dr. Imran Qureshi",
    role: "Lab Director, PrecisePath Diagnostics",
    org: "Hyderabad",
    quote:
      "Sample tracking with a doctor review step removed the phone calls chasing pending results.",
  },
  {
    name: "Sneha Patil",
    role: "Org Admin, Aarogya Group",
    org: "Pune",
    quote:
      "I created our own Front Desk and Senior Nurse roles in minutes — everyone sees exactly their pages.",
  },
  {
    name: "Dr. Vikram Rao",
    role: "Consultant Cardiologist",
    org: "Chennai",
    quote:
      "Consultation notes and prescriptions are quick enough that I actually use them during the visit.",
  },
  {
    name: "Meera Joshi",
    role: "Marketing Lead, SmileWorks Dental",
    org: "Ahmedabad",
    quote:
      "The built-in website and online booking replaced three separate tools we were paying for.",
  },
];

function TestimonialsPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Testimonials"
        title="Trusted by clinics, pharmacies and labs"
        subtitle="Real workflows, real teams — here is what organizations say after moving to MediUnivers."
      />
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((t) => (
            <Card key={t.name} className="flex flex-col p-6">
              <Quote className="h-6 w-6 text-primary/40" />
              <p className="mt-3 flex-1 text-sm text-foreground">“{t.quote}”</p>
              <div className="mt-4 flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.role} · {t.org}
                </p>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild>
            <Link to="/request-demo">Request a demo</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
