import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export interface NavLinkItem {
  label: string;
  url: string;
}

export interface FooterColumn {
  title: string;
  links: NavLinkItem[];
}

export function parseNavLinks(json: string | null | undefined): NavLinkItem[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is NavLinkItem => !!v && typeof v === "object" && "label" in v && "url" in v,
    );
  } catch {
    return [];
  }
}

export function parseFooterColumns(json: string | null | undefined): FooterColumn[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is { title?: unknown; links?: unknown } => !!v && typeof v === "object")
      .map((v) => ({
        title: typeof v.title === "string" ? v.title : "",
        links: Array.isArray(v.links)
          ? v.links.filter(
              (l): l is NavLinkItem => !!l && typeof l === "object" && "label" in l && "url" in l,
            )
          : [],
      }));
  } catch {
    return [];
  }
}

/** Serializes back to the on-disk shape for live editing — keeps blank rows as-is (a freshly
 * "Add link"-ed row is blank until the user types into it; filtering it out immediately would
 * erase it before that). Use {@link cleanNavLinksJson}/{@link cleanFooterColumnsJson} to drop
 * blanks right before saving instead. */
export function serializeNavLinks(items: NavLinkItem[]): string | null {
  return items.length ? JSON.stringify(items) : null;
}

export function serializeFooterColumns(columns: FooterColumn[]): string | null {
  return columns.length ? JSON.stringify(columns) : null;
}

/** Drops blank rows and returns null (not "[]") when nothing's left, so an all-blank field
 * means "use the template's defaults" again. Call this on the saved payload, not on every edit. */
export function cleanNavLinksJson(json: string | null | undefined): string | null {
  const cleaned = parseNavLinks(json).filter((i) => i.label.trim() || i.url.trim());
  return cleaned.length ? JSON.stringify(cleaned) : null;
}

export function cleanFooterColumnsJson(json: string | null | undefined): string | null {
  const cleaned = parseFooterColumns(json)
    .map((c) => ({ ...c, links: c.links.filter((l) => l.label.trim() || l.url.trim()) }))
    .filter((c) => c.title.trim() || c.links.length);
  return cleaned.length ? JSON.stringify(cleaned) : null;
}

/** A plain add/remove list for extra nav links — no JSON, no syntax to get right. These are
 * appended after the site's built-in section links (About, Services, ...), not a replacement
 * for them. */
export function NavLinksEditor({
  value,
  onChange,
}: {
  value: NavLinkItem[];
  onChange: (next: NavLinkItem[]) => void;
}) {
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Label, e.g. Careers"
            value={item.label}
            onChange={(e) =>
              onChange(value.map((v, idx) => (idx === i ? { ...v, label: e.target.value } : v)))
            }
          />
          <Input
            placeholder="Link, e.g. #careers or https://..."
            value={item.url}
            onChange={(e) =>
              onChange(value.map((v, idx) => (idx === i ? { ...v, url: e.target.value } : v)))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            aria-label="Remove link"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, { label: "", url: "" }])}
      >
        <Plus className="h-3.5 w-3.5" /> Add link
      </Button>
    </div>
  );
}

/** Same idea for the footer's link columns — add a column, name it, add links to it. */
export function FooterColumnsEditor({
  value,
  onChange,
}: {
  value: FooterColumn[];
  onChange: (next: FooterColumn[]) => void;
}) {
  function updateColumn(i: number, next: FooterColumn) {
    onChange(value.map((c, idx) => (idx === i ? next : c)));
  }

  return (
    <div className="space-y-3">
      {value.map((column, i) => (
        <Card key={i} className="space-y-3 p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Column title</Label>
              <Input
                placeholder="e.g. Company"
                value={column.title}
                onChange={(e) => updateColumn(i, { ...column, title: e.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              aria-label="Remove column"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 pl-1">
            {column.links.map((link, li) => (
              <div key={li} className="flex items-center gap-2">
                <Input
                  placeholder="Label"
                  value={link.label}
                  onChange={(e) =>
                    updateColumn(i, {
                      ...column,
                      links: column.links.map((l, idx) =>
                        idx === li ? { ...l, label: e.target.value } : l,
                      ),
                    })
                  }
                />
                <Input
                  placeholder="Link"
                  value={link.url}
                  onChange={(e) =>
                    updateColumn(i, {
                      ...column,
                      links: column.links.map((l, idx) =>
                        idx === li ? { ...l, url: e.target.value } : l,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    updateColumn(i, {
                      ...column,
                      links: column.links.filter((_, idx) => idx !== li),
                    })
                  }
                  aria-label="Remove link"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateColumn(i, { ...column, links: [...column.links, { label: "", url: "" }] })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add link
            </Button>
          </div>
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, { title: "", links: [] }])}
      >
        <Plus className="h-3.5 w-3.5" /> Add column
      </Button>
    </div>
  );
}
