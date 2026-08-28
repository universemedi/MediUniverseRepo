import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Star,
  Stethoscope,
  Twitter,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/site/$slug")({
  head: () => ({ meta: [{ title: "Loading site…" }] }),
  component: PublicSitePage,
});

interface WebsiteConfig {
  published: boolean;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  tagline: string | null;
  heroHeading: string | null;
  heroSubheading: string | null;
  aboutContent: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  bookingEnabled: boolean;
}
interface ServiceItem {
  id: number;
  name: string;
  description: string | null;
}
interface PublicDoctor {
  id: number;
  fullName: string;
  qualification: string | null;
  experienceYears: number | null;
  specializations: string[];
}
interface GalleryImage {
  id: number;
  imageUrl: string;
  caption: string | null;
}
interface Testimonial {
  id: number;
  patientName: string;
  message: string;
  rating: number;
}
interface BlogSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
}
interface SiteData {
  organizationName: string;
  slug: string;
  config: WebsiteConfig;
  services: ServiceItem[];
  doctors: PublicDoctor[];
  departments: string[];
  gallery: GalleryImage[];
  testimonials: Testimonial[];
  blogs: BlogSummary[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PublicSitePage() {
  const { slug } = Route.useParams();
  const [site, setSite] = useState<SiteData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiFetch<SiteData>(`/api/public/site/${slug}`)
      .then(setSite)
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">This site isn't available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It may not be published yet, or the address is wrong.
          </p>
        </div>
      </div>
    );
  }
  if (!site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { config } = site;
  const primary = config.primaryColor || "#0f766e";

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{ ["--brand" as string]: primary }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={site.organizationName}
                className="h-8 w-8 rounded object-cover"
              />
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: primary }}
              >
                <Stethoscope className="h-4 w-4" />
              </span>
            )}
            {site.organizationName}
          </div>
          <nav className="hidden gap-6 text-sm text-slate-600 md:flex">
            <a href="#about" className="hover:text-slate-900">
              About
            </a>
            <a href="#services" className="hover:text-slate-900">
              Services
            </a>
            <a href="#doctors" className="hover:text-slate-900">
              Doctors
            </a>
            <a href="#testimonials" className="hover:text-slate-900">
              Testimonials
            </a>
            <a href="#blog" className="hover:text-slate-900">
              Blog
            </a>
            <a href="#contact" className="hover:text-slate-900">
              Contact
            </a>
          </nav>
          {config.bookingEnabled ? (
            <Button asChild size="sm" style={{ backgroundColor: primary }}>
              <a href="#book">
                <CalendarCheck className="h-4 w-4" /> Book appointment
              </a>
            </Button>
          ) : null}
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 text-center" style={{ backgroundColor: `${primary}0d` }}>
        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: primary }}>
          {config.tagline}
        </p>
        <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-bold tracking-tight">
          {config.heroHeading ?? site.organizationName}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">{config.heroSubheading}</p>
      </section>

      {/* About */}
      {config.aboutContent ? (
        <section id="about" className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl font-semibold">About us</h2>
          <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-600">
            {config.aboutContent}
          </p>
        </section>
      ) : null}

      {/* Services */}
      {site.services.length ? (
        <section id="services" className="bg-slate-50 px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-semibold">Services</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {site.services.map((s) => (
                <Card key={s.id} className="p-5">
                  <Sparkles className="h-5 w-5" style={{ color: primary }} />
                  <p className="mt-3 font-semibold">{s.name}</p>
                  {s.description ? (
                    <p className="mt-1 text-sm text-slate-600">{s.description}</p>
                  ) : null}
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Doctors */}
      {site.doctors.length ? (
        <section id="doctors" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold">Our doctors</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {site.doctors.map((d) => (
              <Card key={d.id} className="p-5">
                <p className="font-semibold">Dr. {d.fullName}</p>
                <p className="text-sm text-slate-600">{d.qualification}</p>
                {d.specializations.length ? (
                  <p className="mt-2 text-xs text-slate-500">{d.specializations.join(" · ")}</p>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Departments */}
      {site.departments.length ? (
        <section className="bg-slate-50 px-6 py-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-lg font-semibold">Departments</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {site.departments.map((d) => (
                <span key={d} className="rounded-full border px-3 py-1 text-sm text-slate-600">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Gallery */}
      {site.gallery.length ? (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold">Gallery</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {site.gallery.map((g) => (
              <img
                key={g.id}
                src={g.imageUrl}
                alt={g.caption ?? ""}
                className="h-32 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Testimonials */}
      {site.testimonials.length ? (
        <section id="testimonials" className="bg-slate-50 px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-semibold">What patients say</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {site.testimonials.map((t) => (
                <Card key={t.id} className="p-5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">"{t.message}"</p>
                  <p className="mt-3 text-xs font-medium text-slate-500">{t.patientName}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Blog */}
      {site.blogs.length ? (
        <section id="blog" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold">From our blog</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {site.blogs.map((b) => (
              <Link key={b.id} to="/site/$slug/blog/$blogSlug" params={{ slug, blogSlug: b.slug }}>
                <Card className="h-full overflow-hidden p-0 transition-shadow hover:shadow-md">
                  {b.coverImageUrl ? (
                    <img src={b.coverImageUrl} alt={b.title} className="h-32 w-full object-cover" />
                  ) : null}
                  <div className="p-4">
                    <p className="font-semibold">{b.title}</p>
                    {b.excerpt ? <p className="mt-1 text-sm text-slate-600">{b.excerpt}</p> : null}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Book appointment */}
      {config.bookingEnabled ? (
        <BookingSection slug={slug} doctors={site.doctors} primary={primary} />
      ) : null}

      {/* Contact */}
      <section id="contact" className="bg-slate-50 px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">Get in touch</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {config.contactAddress ? (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {config.contactAddress}
                </p>
              ) : null}
              {config.contactPhone ? (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> {config.contactPhone}
                </p>
              ) : null}
              {config.contactEmail ? (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {config.contactEmail}
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex gap-3 text-slate-500">
              {config.facebookUrl ? (
                <a href={config.facebookUrl} target="_blank" rel="noreferrer">
                  <Facebook className="h-5 w-5" />
                </a>
              ) : null}
              {config.instagramUrl ? (
                <a href={config.instagramUrl} target="_blank" rel="noreferrer">
                  <Instagram className="h-5 w-5" />
                </a>
              ) : null}
              {config.twitterUrl ? (
                <a href={config.twitterUrl} target="_blank" rel="noreferrer">
                  <Twitter className="h-5 w-5" />
                </a>
              ) : null}
              {config.linkedinUrl ? (
                <a href={config.linkedinUrl} target="_blank" rel="noreferrer">
                  <Linkedin className="h-5 w-5" />
                </a>
              ) : null}
              {config.youtubeUrl ? (
                <a href={config.youtubeUrl} target="_blank" rel="noreferrer">
                  <Youtube className="h-5 w-5" />
                </a>
              ) : null}
            </div>
          </div>
          <ContactForm slug={slug} primary={primary} />
        </div>
      </section>

      <footer className="border-t px-6 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {site.organizationName}. Built with MediUnivers.
      </footer>
    </div>
  );
}

function ContactForm({ slug, primary }: { slug: string; primary: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !EMAIL_RE.test(email.trim()) || !message.trim()) {
      return setError("Name, a valid email, and a message are required.");
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/public/site/${slug}/contact`, {
        method: "POST",
        data: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          message: message.trim(),
        },
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't send your message. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="flex items-center justify-center p-8 text-center text-sm text-slate-600">
        Thanks — we'll get back to you soon.
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form className="space-y-3" onSubmit={submit} noValidate>
        <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Textarea
          placeholder="Message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          className="w-full"
          style={{ backgroundColor: primary }}
          disabled={submitting}
        >
          {submitting ? "Sending…" : "Send message"}
        </Button>
      </form>
    </Card>
  );
}

function BookingSection({
  slug,
  doctors,
  primary,
}: {
  slug: string;
  doctors: PublicDoctor[];
  primary: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim() || !doctorId)
      return setError("Name, phone and doctor are required.");
    setError(null);
    setSubmitting(true);
    try {
      const appt = await apiFetch<{ appointmentNumber: string }>(
        `/api/public/site/${slug}/book-appointment`,
        {
          method: "POST",
          data: {
            patientFirstName: firstName.trim(),
            patientLastName: lastName.trim() || null,
            phone: phone.trim(),
            email: email.trim() || null,
            doctorId: Number(doctorId),
            appointmentDate: date,
            reason: reason.trim() || null,
          },
        },
      );
      setConfirmed(appt.appointmentNumber);
      toast.success("Appointment requested");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't book this appointment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="book" className="mx-auto max-w-2xl px-6 py-16">
      <h2 className="text-2xl font-semibold">Book an appointment</h2>
      <p className="mt-1 text-sm text-slate-600">
        We'll confirm by phone shortly after you submit.
      </p>
      <Card className="mt-6 p-6">
        {confirmed ? (
          <div className="text-center">
            <CalendarCheck className="mx-auto h-6 w-6" style={{ color: primary }} />
            <p className="mt-3 font-semibold">Request received — {confirmed}</p>
            <p className="mt-1 text-sm text-slate-600">We'll call you to confirm the time.</p>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={submit} noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      Dr. {d.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Input
              placeholder="Reason for visit (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="submit"
              className="w-full"
              style={{ backgroundColor: primary }}
              disabled={submitting}
            >
              {submitting ? "Booking…" : "Request appointment"}
            </Button>
          </form>
        )}
      </Card>
    </section>
  );
}
