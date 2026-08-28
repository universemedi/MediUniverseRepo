import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { FormBuilder } from "@/components/form/FormBuilder";
import { col } from "@/config/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact MediUnivers — Sales & Support" },
      {
        name: "description",
        content:
          "Get in touch with the MediUnivers team for sales, onboarding or support. Call, email or send us a message and we reply within one business day.",
      },
      { property: "og:title", content: "Contact MediUnivers" },
      { property: "og:description", content: "Reach the MediUnivers sales and support teams." },
    ],
  }),
  component: ContactPage,
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
  col("organization", "Organization", "org", { required: true, placeholder: "Nair Family Clinic" }),
  col("topic", "I need help with", "badge", {
    required: true,
    fieldType: "select",
    options: [
      "Sales & pricing",
      "Product demo",
      "Onboarding",
      "Technical support",
      "Billing",
      "Partnership",
    ],
  }),
  col("message", "Message", "text", {
    required: true,
    fieldType: "textarea",
    placeholder: "Tell us a little about your organization and what you need.",
  }),
];

const DETAILS = [
  { icon: Mail, label: "Email", value: "hello@mediunivers.io" },
  { icon: Phone, label: "Phone", value: "+91 80 4567 8900" },
  { icon: MapPin, label: "Office", value: "4th Floor, Prestige Tech Park, Bengaluru 560103" },
];

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact"
        title="Talk to the MediUnivers team"
        subtitle="Sales, onboarding or support — send us a note and we get back within one business day."
      />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          {DETAILS.map((d) => (
            <Card key={d.label} className="flex items-start gap-3 p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <d.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.label}</p>
                <p className="text-sm font-medium text-foreground">{d.value}</p>
              </div>
            </Card>
          ))}
          <Card className="p-5">
            <p className="text-sm font-semibold text-foreground">Support hours</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Mon–Sat, 9:00 – 20:00 IST. Enterprise plans include 24×7 on-call.
            </p>
          </Card>
        </div>

        <Card className="p-6">
          {sent ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-3 text-lg font-semibold text-foreground">Message sent</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Our team has received your enquiry and will reply shortly.
              </p>
              <Button className="mt-5" variant="outline" onClick={() => setSent(false)}>
                Send another message
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground">Send us a message</h2>
              <p className="mt-1 mb-5 text-sm text-muted-foreground">
                Fields marked * are required.
              </p>
              <FormBuilder
                columns={FIELDS}
                submitLabel="Send message"
                onSubmit={() => {
                  setSent(true);
                  toast.success("Message sent", {
                    description: "We will get back to you shortly.",
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
