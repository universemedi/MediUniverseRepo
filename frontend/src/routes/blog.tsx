import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Healthcare Operations Insights | MediUnivers" },
      {
        name: "description",
        content:
          "Practical articles on clinic queue management, pharmacy stock control, lab turnaround time and growing a healthcare practice.",
      },
      { property: "og:title", content: "MediUnivers Blog" },
      {
        property: "og:description",
        content: "Insights on running clinics, pharmacies and diagnostic labs.",
      },
    ],
  }),
  component: BlogPage,
});

const POSTS = [
  {
    title: "Cutting patient wait time with a live queue",
    category: "Clinic",
    date: "12 Jul 2026",
    read: "6 min",
    excerpt: "How token-based queues and reception dashboards reduce the crowd at your front desk.",
  },
  {
    title: "Batch and expiry: the pharmacy discipline that saves money",
    category: "Pharmacy",
    date: "28 Jun 2026",
    read: "5 min",
    excerpt: "A simple stock policy that prevents write-offs and keeps fast movers on the shelf.",
  },
  {
    title: "Lab turnaround time, measured properly",
    category: "Laboratory",
    date: "14 Jun 2026",
    read: "7 min",
    excerpt: "Where samples actually get stuck, and the four checkpoints worth tracking.",
  },
  {
    title: "Converting enquiries into first appointments",
    category: "CRM",
    date: "02 Jun 2026",
    read: "4 min",
    excerpt: "Follow-up cadence, lead sources and the metrics that predict conversion.",
  },
  {
    title: "Designing roles for a multi-branch group",
    category: "Access control",
    date: "21 May 2026",
    read: "6 min",
    excerpt: "Give each team the pages they need — nothing more — without slowing anyone down.",
  },
  {
    title: "Your clinic website should book appointments",
    category: "Website",
    date: "09 May 2026",
    read: "5 min",
    excerpt: "Turning a brochure site into the cheapest patient acquisition channel you have.",
  },
];

function BlogPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Blog"
        title="Ideas for running a better practice"
        subtitle="Operational playbooks from the teams building and using MediUnivers."
      />
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((p) => (
            <Card key={p.title} className="flex flex-col p-6 transition-shadow hover:shadow-md">
              <Badge
                variant="outline"
                className="w-fit border-primary/25 bg-primary/10 text-primary"
              >
                {p.category}
              </Badge>
              <h2 className="mt-3 text-base font-semibold text-foreground">{p.title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.excerpt}</p>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> {p.date} · {p.read} read
              </p>
            </Card>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="outline">
            <Link to="/contact">Suggest a topic</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
