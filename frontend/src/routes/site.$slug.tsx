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
  Menu,
  Phone,
  Sparkles,
  Star,
  Stethoscope,
  Twitter,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError, resolveUploadUrl } from "@/lib/api";
import { HeroCarousel } from "@/components/common/HeroCarousel";
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
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { parseFooterColumns, parseNavLinks } from "@/components/common/SiteNavFooterEditors";

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
  bannersJson: string | null;
  heroVideoUrl: string | null;
  navItemsJson: string | null;
  footerColumnsJson: string | null;
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
  photoUrl: string | null;
  experienceYears: number | null;
  specializations: string[];
  branchId: number | null;
}
interface PublicBranch {
  id: number;
  name: string;
  headOffice: boolean;
  city: string | null;
  addressLine1: string | null;
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
  branches: PublicBranch[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseImageArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
}

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
  const logoUrl = config.logoUrl ? resolveUploadUrl(config.logoUrl) : null;
  const carouselImages = parseImageArray(config.bannersJson).map(resolveUploadUrl);
  const hasCarousel = carouselImages.length > 0;
  const videoUrl = config.heroVideoUrl ? resolveUploadUrl(config.heroVideoUrl) : null;
  const extraNavLinks = parseNavLinks(config.navItemsJson);
  const footerColumns = parseFooterColumns(config.footerColumnsJson);

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{ ["--brand" as string]: primary }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            {logoUrl ? (
              <img
                src={logoUrl}
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
          <nav className="hidden gap-6 text-sm text-slate-600 lg:flex">
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
            {extraNavLinks.map((link, i) => (
              <a key={i} href={link.url} className="hover:text-slate-900">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" style={{ backgroundColor: primary }}>
              <a href="#book">
                <CalendarCheck className="h-4 w-4" /> Book appointment
              </a>
            </Button>
          </div>

          {/* Below "lg" there's no room for the full nav + both buttons — everything moves
              into this one menu instead of cramming/clipping the header row. */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-72 flex-col gap-6">
              <SheetTitle>{site.organizationName}</SheetTitle>
              <nav className="flex flex-col gap-4 text-sm text-slate-600">
                <SheetClose asChild>
                  <a href="#about" className="hover:text-slate-900">
                    About
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#services" className="hover:text-slate-900">
                    Services
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#doctors" className="hover:text-slate-900">
                    Doctors
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#testimonials" className="hover:text-slate-900">
                    Testimonials
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#blog" className="hover:text-slate-900">
                    Blog
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#contact" className="hover:text-slate-900">
                    Contact
                  </a>
                </SheetClose>
                {extraNavLinks.map((link, i) => (
                  <SheetClose key={i} asChild>
                    <a href={link.url} className="hover:text-slate-900">
                      {link.label}
                    </a>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t pt-4">
                <SheetClose asChild>
                  <Button asChild variant="outline">
                    <Link to="/login">Sign in</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild style={{ backgroundColor: primary }}>
                    <a href="#book">
                      <CalendarCheck className="h-4 w-4" /> Book appointment
                    </a>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-6 py-20 text-center"
        style={{ backgroundColor: hasCarousel ? undefined : `${primary}0d` }}
      >
        {hasCarousel ? (
          <>
            <HeroCarousel images={carouselImages} />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/75" />
          </>
        ) : null}
        <div className="relative">
          <p
            className="text-sm font-medium uppercase tracking-wide"
            style={{ color: hasCarousel ? "#fff" : primary }}
          >
            {config.tagline}
          </p>
          <h1
            className={`mx-auto mt-3 max-w-2xl text-4xl font-bold tracking-tight ${hasCarousel ? "text-white" : ""}`}
          >
            {config.heroHeading ?? site.organizationName}
          </h1>
          <p
            className={`mx-auto mt-4 max-w-xl ${hasCarousel ? "text-white/85" : "text-slate-600"}`}
          >
            {config.heroSubheading}
          </p>
          {videoUrl ? (
            <div className="mx-auto mt-8 max-w-2xl">
              <video
                src={videoUrl}
                controls
                className="w-full rounded-xl border border-white/20 shadow-lg"
              />
            </div>
          ) : null}
        </div>
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
              <Card key={d.id} className="flex gap-3 p-5">
                {d.photoUrl ? (
                  <img
                    src={resolveUploadUrl(d.photoUrl)}
                    alt={d.fullName}
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: primary }}
                  >
                    <Stethoscope className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="font-semibold">Dr. {d.fullName}</p>
                  <p className="text-sm text-slate-600">{d.qualification}</p>
                  {d.specializations.length ? (
                    <p className="mt-2 text-xs text-slate-500">{d.specializations.join(" · ")}</p>
                  ) : null}
                </div>
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

      {/* Book appointment — mandatory on every organization website (req #11) */}
      <BookingSection
        slug={slug}
        doctors={site.doctors}
        branches={site.branches}
        primary={primary}
      />

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

      <footer className="border-t px-6 py-10 text-slate-500">
        {footerColumns.length ? (
          <div className="mx-auto grid max-w-6xl gap-8 pb-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerColumns.map((column, i) => (
              <div key={i}>
                {column.title ? (
                  <p className="text-sm font-semibold text-slate-900">{column.title}</p>
                ) : null}
                <ul className="mt-3 space-y-2 text-sm">
                  {column.links.map((link, li) => (
                    <li key={li}>
                      <a href={link.url} className="hover:text-slate-900">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
        <p
          className={
            footerColumns.length
              ? "mx-auto max-w-6xl border-t pt-6 text-center text-xs"
              : "text-center text-xs"
          }
        >
          © {new Date().getFullYear()} {site.organizationName}. Built with MediUnivers.
        </p>
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
  branches,
  primary,
}: {
  slug: string;
  doctors: PublicDoctor[];
  branches: PublicBranch[];
  primary: string;
}) {
  const multiBranch = branches.length > 1;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState(() =>
    multiBranch ? "" : branches[0] ? String(branches[0].id) : "",
  );
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  // A doctor with no branch on file works anywhere — only doctors pinned to a *different*
  // branch than the one picked drop out of the list.
  const availableDoctors = branchId
    ? doctors.filter((d) => d.branchId == null || d.branchId === Number(branchId))
    : doctors;

  function handleBranchChange(value: string) {
    setBranchId(value);
    if (
      doctorId &&
      !doctors.some(
        (d) => String(d.id) === doctorId && (d.branchId == null || d.branchId === Number(value)),
      )
    ) {
      setDoctorId("");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim() || !doctorId)
      return setError("Name, phone and doctor are required.");
    if (multiBranch && !branchId) return setError("Pick which branch you'd like to visit.");
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
            branchId: branchId ? Number(branchId) : null,
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
            {multiBranch ? (
              <Select value={branchId} onValueChange={handleBranchChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                      {b.city ? ` · ${b.city}` : ""}
                      {b.headOffice ? " (Head office)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {availableDoctors.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No doctors at this branch yet.
                    </div>
                  ) : (
                    availableDoctors.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        Dr. {d.fullName}
                      </SelectItem>
                    ))
                  )}
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
