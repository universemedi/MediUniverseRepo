import { HelpCircle, type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

/** lucide-react's only non-component exports — everything else starting with an
 * uppercase letter is a real icon component, whether it's a plain function or (as in
 * current versions) a forwardRef-wrapped object, so we can't gate on `typeof === "function"`. */
const NON_ICON_EXPORTS = new Set(["createLucideIcon", "icons"]);

/** Resolves a lucide-react icon by its PascalCase export name (as typed into an admin
 * "Icon" field, e.g. "HeartPulse") — falls back to a generic icon if the name is empty
 * or unknown. */
export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name || NON_ICON_EXPORTS.has(name)) return HelpCircle;
  const icon = (LucideIcons as unknown as Record<string, unknown>)[name];
  return icon ? (icon as LucideIcon) : HelpCircle;
}
