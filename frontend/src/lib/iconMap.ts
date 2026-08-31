import { HelpCircle, type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

/** Resolves a lucide-react icon by its PascalCase export name (as typed into an admin
 * "Icon" field, e.g. "HeartPulse") — falls back to a generic icon if the name is empty,
 * unknown, or not actually an icon component (lucide-react also exports helper functions). */
export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return HelpCircle;
  const icon = (LucideIcons as unknown as Record<string, unknown>)[name];
  return typeof icon === "function" ? (icon as LucideIcon) : HelpCircle;
}
