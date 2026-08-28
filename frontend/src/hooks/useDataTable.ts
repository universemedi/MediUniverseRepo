import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@/config/types";
import type { Row } from "@/lib/rows";
import { exportRowsToExcel, exportRowsToPdf } from "@/lib/export";

export interface UseDataTableOptions {
  id: string;
  rows: Row[];
  columns: ColumnDef[];
  initialPageSize?: number;
}

export function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useDataTable({ id, rows, columns, initialPageSize = 10 }: UseDataTableOptions) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 220);
    return () => clearTimeout(t);
  }, [id, page, pageSize, search, sortBy, sortDir, filters, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, filters, id, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    let data = rows;
    const q = search.trim().toLowerCase();

    if (q) {
      data = data.filter((r) =>
        columns.some((c) =>
          String(r[c.key] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }

    for (const [key, value] of Object.entries(filters)) {
      if (value && value !== "__all") {
        data = data.filter((r) => String(r[key] ?? "") === value);
      }
    }

    const dateColumn = columns.find((c) => c.type === "date");
    if ((dateFrom || dateTo) && dateColumn) {
      const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
      const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : Infinity;

      data = data.filter((r) => {
        const raw = String(r[dateColumn.key] ?? "");
        if (!raw) return false;
        const timestamp = Date.parse(raw);
        return Number.isNaN(timestamp)
          ? (!dateFrom || raw >= dateFrom) && (!dateTo || raw <= dateTo)
          : timestamp >= from && timestamp <= to;
      });
    }

    if (sortBy) {
      data = [...data].sort((a, b) => {
        const av = a[sortBy];
        const bv = b[sortBy];
        const an = typeof av === "number" ? av : Number(String(av).replace(/[^\d.-]/g, ""));
        const bn = typeof bv === "number" ? bv : Number(String(bv).replace(/[^\d.-]/g, ""));
        const cmp =
          !Number.isNaN(an) && !Number.isNaN(bn) && /\d/.test(String(av))
            ? an - bn
            : String(av ?? "").localeCompare(String(bv ?? ""));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return data;
  }, [rows, columns, search, sortBy, sortDir, filters, dateFrom, dateTo]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hidden.includes(c.key)),
    [columns, hidden],
  );

  function toggleSort(key: string) {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  function toggleColumn(key: string) {
    setHidden((h) => (h.includes(key) ? h.filter((k) => k !== key) : [...h, key]));
  }

  function toggleSelect(rowId: string) {
    setSelected((s) => (s.includes(rowId) ? s.filter((i) => i !== rowId) : [...s, rowId]));
  }

  function toggleSelectAll() {
    const ids = pageRows.map((r) => r.id);
    const allSelected = ids.every((i) => selected.includes(i));
    setSelected(
      allSelected
        ? selected.filter((i) => !ids.includes(i))
        : Array.from(new Set([...selected, ...ids])),
    );
  }

  function clearFilters() {
    setFilters({});
    setDateFrom("");
    setDateTo("");
  }

  function exportCsv(filename: string) {
    exportRowsToExcel(filename, filtered, visibleColumns);
  }

  function exportExcel(filename: string) {
    exportRowsToExcel(filename, filtered, visibleColumns);
  }

  function exportPdf(filename: string) {
    exportRowsToPdf(filename, filtered, visibleColumns, {
      title: id,
      dateFrom,
      dateTo,
    });
  }

  return {
    query: { page: safePage, pageSize, search, sortBy, sortDir, filters, dateFrom, dateTo },
    loading,
    rows: pageRows,
    filteredRows: filtered,
    total,
    pageCount,
    page: safePage,
    pageSize,
    searchInput,
    sortBy,
    sortDir,
    selected,
    hidden,
    visibleColumns,
    filters,
    dateFrom,
    dateTo,
    setPage,
    setPageSize,
    setSearchInput,
    setFilters,
    setDateFrom,
    setDateTo,
    toggleSort,
    toggleColumn,
    toggleSelect,
    toggleSelectAll,
    clearSelection: () => setSelected([]),
    clearFilters,
    exportCsv,
    exportExcel,
    exportPdf,
  };
}

export type DataTableApi = ReturnType<typeof useDataTable>;
