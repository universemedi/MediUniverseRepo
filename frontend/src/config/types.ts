import type { ReactNode } from "react";

export type ColumnType =
  | "text"
  | "name"
  | "badge"
  | "money"
  | "date"
  | "number"
  | "email"
  | "phone"
  | "city"
  | "org"
  | "percent"
  | "code";

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  options?: string[];
  /** render options with react-select; enables searchable multi-select when true */
  multiple?: boolean;
  required?: boolean;
  /** hide on small screens in the table (still shown in the mobile card) */
  secondary?: boolean;
  /** exclude from the create/edit form */
  formHidden?: boolean;
  fieldType?:
    "text" | "textarea" | "select" | "number" | "date" | "switch" | "email" | "phone" | "money";
  placeholder?: string;
  help?: string;
  /** Key of another field this one cascades from (e.g. a city field depending on a state field) — its current value is passed to `optionsFor`. */
  dependsOn?: string;
  /** Computes this field's options from its `dependsOn` field's current value — takes priority over `options` when set. Disables the field while the dependency is empty. May return a Promise (e.g. an API call) — the field shows its loading state until it resolves. */
  optionsFor?: (dependencyValue: string) => string[] | Promise<string[]>;
  /** Custom table-cell content — takes over from the default text/badge rendering when set. The table (create/edit form) is unaffected. */
  render?: (row: Record<string, string | number>) => ReactNode;
}

export interface StatDef {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon?: string;
}

export interface ChartDef {
  type: "area" | "bar" | "line" | "pie";
  title: string;
  dataKeys: string[];
  categories: string[];
}

export interface ModulePageDef {
  /** url path after /app/ */
  path: string;
  title: string;
  description: string;
  /** rbac module bucket */
  group: "platform" | "org" | "billing" | "clinic" | "pharmacy" | "lab" | "crm" | "cms" | "patient";
  singular: string;
  columns: ColumnDef[];
  rowCount?: number;
  stats?: StatDef[];
  charts?: ChartDef[];
  kanban?: boolean;
}

export const col = (
  key: string,
  label: string,
  type: ColumnType = "text",
  extra: Partial<ColumnDef> = {},
): ColumnDef => ({ key, label, type, ...extra });
