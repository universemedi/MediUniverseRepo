import { cn } from "@/lib/utils";

/**
 * MediUnivers brand mark — a rounded cross/pulse motif.
 * Single source of truth so the logo never drifts between the
 * marketing site, the login screen and the console sidebar.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-full w-full", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" className="text-primary" />
      <path d="M16 7v18M7 16h18" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
      <path
        d="M6.5 19.5 10 16l2.4 2.6L16 14l3 3.6 3.5-3.6 3 3"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}

interface LogoProps {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  subtitle?: string;
  className?: string;
  wordmarkClassName?: string;
}

const SIZES: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-11 w-11",
};

export function Logo({
  size = "md",
  withWordmark = true,
  subtitle,
  className,
  wordmarkClassName,
}: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className={cn("shrink-0 overflow-hidden rounded-lg shadow-sm", SIZES[size])}>
        <LogoMark />
      </span>
      {withWordmark ? (
        <span className="min-w-0 leading-tight">
          <span
            className={cn(
              "block truncate text-base font-bold tracking-tight text-foreground",
              wordmarkClassName,
            )}
          >
            Medi<span className="text-primary">Univers</span>
          </span>
          {subtitle ? (
            <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
