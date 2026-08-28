import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ColumnDef } from "@/config/types";
import type { Row } from "@/lib/rows";

function safeFilename(name: string) {
  return (
    name
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "report"
  );
}

function tableData(rows: Row[], columns: ColumnDef[]) {
  return {
    headers: columns.map((c) => c.label),
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
  };
}

export function exportRowsToExcel(filename: string, rows: Row[], columns: ColumnDef[]) {
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.label, row[c.key] ?? ""])),
  );
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = columns.map((c) => ({
    wch: Math.max(12, Math.min(32, c.label.length + 4)),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${safeFilename(filename)}.xlsx`);
}

export function exportRowsToPdf(
  filename: string,
  rows: Row[],
  columns: ColumnDef[],
  meta: { title: string; dateFrom?: string; dateTo?: string },
) {
  const doc = new jsPDF({ orientation: columns.length > 7 ? "landscape" : "portrait" });
  const { headers, body } = tableData(rows, columns);

  doc.setFontSize(16);
  doc.text(meta.title.replaceAll("-", " "), 14, 16);
  doc.setFontSize(9);

  const range =
    meta.dateFrom || meta.dateTo
      ? `Date range: ${meta.dateFrom || "Any"} to ${meta.dateTo || "Any"}`
      : `Generated: ${new Date().toLocaleString("en-IN")}`;

  doc.setTextColor(100);
  doc.text(`${range} · ${rows.length} record${rows.length === 1 ? "" : "s"}`, 14, 23);
  doc.setTextColor(0);

  autoTable(doc, {
    head: [headers],
    body,
    startY: 29,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fontSize: 7, fontStyle: "bold" },
    margin: { left: 10, right: 10 },
  });

  doc.save(`${safeFilename(filename)}.pdf`);
}
