import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/common/Logo";

export const SITE_NAV = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/solutions", label: "Solutions" },
  { to: "/pricing", label: "Pricing" },
  { to: "/testimonials", label: "Testimonials" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

function Brand() {
  return (
    <Link to="/" aria-label="MediUnivers home">
      <Logo size="sm" />
    </Link>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Brand />

        <nav className="mx-auto hidden items-center gap-0.5 rounded-full border border-border bg-card/60 px-1.5 py-1 md:flex">
          {SITE_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-primary text-primary-foreground shadow-sm" }}
              className="rounded-full px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:px-3 lg:text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/free-trial">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="ml-auto lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-6">
            <SheetTitle className="mb-4">Menu</SheetTitle>
            <nav className="flex flex-col gap-1">
              {SITE_NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: item.to === "/" }}
                  activeProps={{ className: "bg-primary/10 text-primary" }}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 grid gap-2">
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link to="/request-demo">Request demo</Link>
              </Button>
              <Button asChild onClick={() => setOpen(false)}>
                <Link to="/free-trial">Start free trial</Link>
              </Button>
              <Button asChild variant="ghost" onClick={() => setOpen(false)}>
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function SiteFooter() {
  const columns = [
    {
      title: "Product",
      links: [
        { to: "/features", label: "Features" },
        { to: "/solutions", label: "Solutions" },
        { to: "/pricing", label: "Pricing" },
        { to: "/testimonials", label: "Testimonials" },
      ],
    },
    {
      title: "Company",
      links: [
        { to: "/about", label: "About us" },
        { to: "/blog", label: "Blog" },
        { to: "/contact", label: "Contact" },
        { to: "/login", label: "Sign in" },
      ],
    },
    {
      title: "Get started",
      links: [
        { to: "/request-demo", label: "Request a demo" },
        { to: "/free-trial", label: "Start free trial" },
      ],
    },
  ] as const;

  return (
    <footer className="mt-auto border-t border-primary/20 bg-primary/[0.07]">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Brand />
            <p className="text-sm text-muted-foreground">
              Multi-tenant healthcare platform for clinics, pharmacies and diagnostic laboratories.
            </p>
            <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
              Frontend demo · mock data
            </Badge>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="transition-colors hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {col.title === "Get started" && (
                <address className="mt-5 space-y-1 text-sm not-italic text-muted-foreground">
                  <p>hello@mediunivers.io</p>
                  <p>+91 80 4567 8900</p>
                  <p>Bengaluru, India</p>
                </address>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-primary/15">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} MediUnivers. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Security</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="border-b border-border bg-primary/5">
      <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:py-20">
        <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
          {eyebrow}
        </Badge>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">{subtitle}</p>
      </div>
    </section>
  );
}
