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
