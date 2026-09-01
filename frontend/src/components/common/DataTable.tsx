import { useState, type ReactNode } from "react";
import {
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { ColumnDef } from "@/config/types";
import type { Row } from "@/lib/rows";
import { useDataTable } from "@/hooks/useDataTable";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DataTableProps {
  id: string;
  title: string;
  rows: Row[];
  columns: ColumnDef[];
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  createLabel?: string;
  onCreate?: () => void;
  onEdit?: (row: Row) => void;
  onDelete?: (row: Row) => void;
  /** Extra row actions between Edit and Delete — e.g. "Share via email". Omit for the default Edit/Delete-only menu. */
  rowActions?: (row: Row) => { label: string; icon: ReactNode; onClick: () => void }[];
}

function cellClass(type: ColumnDef["type"]) {
  if (type === "money" || type === "number" || type === "percent") return "tabular-nums";
  if (type === "name" || type === "org") return "font-medium text-foreground";
  return "";
}

function badgeTone(value: string) {
  const v = value.toLowerCase();
  if (/(active|live|won|paid|completed|approved|in stock|success)/.test(v))
    return "bg-primary/12 text-primary border-primary/25";
  if (/(pending|trial|new|scheduled|processing|waiting|draft)/.test(v))
    return "bg-amber-500/12 text-amber-600 border-amber-500/25 dark:text-amber-400";
  if (/(suspended|lost|cancel|failed|expired|out of stock|overdue|inactive)/.test(v))
    return "bg-destructive/12 text-destructive border-destructive/25";
  return "bg-muted text-muted-foreground border-border";
}

export function DataTable(props: DataTableProps) {
  const {
    id,
    title,
    rows,
    columns,
    canCreate,
    canUpdate,
    canDelete,
    canExport,
    createLabel,
    rowActions,
  } = props;
  const t = useDataTable({ id, rows, columns });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const showActions = Boolean(canUpdate || canDelete || rowActions);
  const filterable = columns.filter((c) => c.options?.length);
  const hasDateFilter = columns.some((c) => c.type === "date");
  const activeFilters = Object.entries(t.filters).filter(([, v]) => v && v !== "__all");
  const hasDateRange = Boolean(t.dateFrom || t.dateTo);

  return (
    <Card className="overflow-hidden p-0">
      {/* toolbar */}
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={t.searchInput}
            onChange={(e) => t.setSearchInput(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="pl-9"
            aria-label={`Search ${title}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterable.length || hasDateFilter ? (
            <Button variant="outline" size="sm" onClick={() => setFiltersOpen((o) => !o)}>
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilters.length + (hasDateRange ? 1 : 0) ? (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {activeFilters.length + (hasDateRange ? 1 : 0)}
                </span>
              ) : null}
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!t.hidden.includes(c.key)}
                  onCheckedChange={() => t.toggleColumn(c.key)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {canExport ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export current filtered data</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => t.exportExcel(id.replace(/\W+/g, "-"))}>
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => t.exportPdf(id.replace(/\W+/g, "-"))}>
                  PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {canCreate ? (
            <Button size="sm" onClick={props.onCreate}>
              <Plus className="h-4 w-4" />
              {createLabel ?? "New"}
            </Button>
          ) : null}
        </div>
      </div>

      {filtersOpen && (filterable.length || hasDateFilter) ? (
        <div className="grid gap-3 border-b border-border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {filterable.map((c) => (
            <div key={c.key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{c.label}</label>
              <Select
                value={t.filters[c.key] ?? "__all"}
                onValueChange={(v) => t.setFilters({ ...t.filters, [c.key]: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {(c.options ?? []).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {hasDateFilter ? (
            <>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> From date
                </label>
                <Input
                  type="date"
                  value={t.dateFrom}
                  max={t.dateTo || undefined}
                  onChange={(e) => t.setDateFrom(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> To date
                </label>
                <Input
                  type="date"
                  value={t.dateTo}
                  min={t.dateFrom || undefined}
                  onChange={(e) => t.setDateTo(e.target.value)}
                  className="bg-background"
                />
              </div>
            </>
          ) : null}

          {activeFilters.length || hasDateRange ? (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={t.clearFilters}>
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {t.selected.length ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-primary/5 px-4 py-2 text-sm">
          <span className="font-medium text-primary">{t.selected.length} selected</span>
          {canDelete ? (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={t.clearSelection}>
            Clear
          </Button>
        </div>
      ) : null}

      {/* desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={t.rows.length > 0 && t.rows.every((r) => t.selected.includes(r.id))}
                  onCheckedChange={t.toggleSelectAll}
                  aria-label="Select all rows"
                />
              </th>
              <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                #
              </th>
              {t.visibleColumns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    c.secondary && "hidden xl:table-cell",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => t.toggleSort(c.key)}
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    {c.label}
                    <ArrowUpDown
                      className={cn("h-3 w-3", t.sortBy === c.key ? "text-primary" : "opacity-40")}
                    />
                  </button>
                </th>
              ))}
              {showActions ? <th className="w-12 px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {t.loading
              ? Array.from({ length: t.pageSize > 10 ? 10 : t.pageSize }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-4" />
                    </td>
                    {t.visibleColumns.map((c) => (
                      <td
                        key={c.key}
                        className={cn("px-4 py-3", c.secondary && "hidden xl:table-cell")}
                      >
                        <Skeleton className="h-4 w-24" />
                      </td>
                    ))}
                    {showActions ? (
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-4" />
                      </td>
                    ) : null}
                  </tr>
                ))
              : t.rows.map((r, rowIndex) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-border/60 transition-colors hover:bg-accent/40",
                      t.selected.includes(r.id) && "bg-primary/5",
                    )}
                  >
                    <td className="px-4" style={{ paddingBlock: "var(--row-py)" }}>
                      <Checkbox
                        checked={t.selected.includes(r.id)}
                        onCheckedChange={() => t.toggleSelect(r.id)}
                        aria-label="Select row"
                      />
                    </td>
                    <td
                      className="px-4 text-sm text-muted-foreground tabular-nums"
                      style={{ paddingBlock: "var(--row-py)" }}
                    >
                      {(t.page - 1) * t.pageSize + rowIndex + 1}
                    </td>
                    {t.visibleColumns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4",
                          cellClass(c.type),
                          c.secondary && "hidden xl:table-cell",
                        )}
                        style={{ paddingBlock: "var(--row-py)" }}
                      >
                        {c.render ? (
                          c.render(r)
                        ) : c.type === "badge" ? (
                          <Badge
                            variant="outline"
                            className={cn("font-medium", badgeTone(String(r[c.key])))}
                          >
                            {String(r[c.key])}
                          </Badge>
                        ) : (
                          <span className="line-clamp-1">{String(r[c.key] ?? "—")}</span>
                        )}
                      </td>
                    ))}
                    {showActions ? (
                      <td className="px-4" style={{ paddingBlock: "var(--row-py)" }}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Row actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => props.onEdit?.(r)}
                              disabled={!canUpdate}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {rowActions?.(r).map((a) => (
                              <DropdownMenuItem key={a.label} onClick={a.onClick}>
                                {a.icon}
                                {a.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem
                              onClick={() => props.onDelete?.(r)}
                              disabled={!canDelete}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    ) : null}
                  </tr>
                ))}
            {!t.loading && t.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={t.visibleColumns.length + (showActions ? 3 : 2)}
                  className="px-4 py-16 text-center"
                >
                  <p className="text-sm font-medium text-foreground">No records found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try a different search term or clear the filters.
                  </p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <div className="divide-y divide-border md:hidden">
        {t.loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))
          : t.rows.map((r) => {
              const [first, ...rest] = t.visibleColumns;
              return (
                <div key={r.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={t.selected.includes(r.id)}
                        onCheckedChange={() => t.toggleSelect(r.id)}
                        aria-label="Select row"
                        className="mt-0.5"
                      />
                      <p className="font-medium text-foreground">{String(r[first?.key ?? "id"])}</p>
                    </div>
                    {showActions ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Row actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => props.onEdit?.(r)} disabled={!canUpdate}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {rowActions?.(r).map((a) => (
                            <DropdownMenuItem key={a.label} onClick={a.onClick}>
                              {a.icon}
                              {a.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem
                            onClick={() => props.onDelete?.(r)}
                            disabled={!canDelete}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 pl-7">
                    {rest.map((c) => (
                      <div key={c.key} className="min-w-0">
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {c.label}
                        </dt>
                        <dd className={cn("truncate text-sm", cellClass(c.type))}>
                          {c.render ? (
                            c.render(r)
                          ) : c.type === "badge" ? (
                            <Badge
                              variant="outline"
                              className={cn("font-medium", badgeTone(String(r[c.key])))}
                            >
                              {String(r[c.key])}
                            </Badge>
                          ) : (
                            String(r[c.key] ?? "—")
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
        {!t.loading && t.rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No records found.</p>
        ) : null}
      </div>

      {/* pagination */}
      <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {t.total === 0 ? 0 : (t.page - 1) * t.pageSize + 1}–
            {Math.min(t.page * t.pageSize, t.total)}
          </span>{" "}
          of <span className="font-medium text-foreground">{t.total}</span>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(t.pageSize)} onValueChange={(v) => t.setPageSize(Number(v))}>
            <SelectTrigger className="h-9 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={t.page <= 1}
              onClick={() => t.setPage(t.page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, t.pageCount) }).map((_, i) => {
              const start = Math.max(1, Math.min(t.page - 2, t.pageCount - 4));
              const p = start + i;
              if (p > t.pageCount) return null;
              return (
                <Button
                  key={p}
                  variant={p === t.page ? "default" : "outline"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => t.setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={t.page >= t.pageCount}
              onClick={() => t.setPage(t.page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
