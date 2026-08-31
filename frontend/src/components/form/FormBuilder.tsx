import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import Select, { type MultiValue, type SingleValue, type StylesConfig } from "react-select";
import type { ColumnDef } from "@/config/types";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, Check } from "lucide-react";

export type FormValues = Record<string, string>;

const INDIA_CODE = "+91";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INDIA_PHONE_REGEX = /^[6-9]\d{9}$/;

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

/** Strips the "+91" prefix as a literal string first, then normalizes — stripping
 * non-digits from the already-prefixed value directly would leak the prefix's own
 * "9" and "1" back in as if the user had typed them (e.g. typing "9898" would
 * visually become "9198989898..." on every keystroke). */
function displayDigits(value: string) {
  const withoutCode = value.startsWith(INDIA_CODE) ? value.slice(INDIA_CODE.length) : value;
  return normalizePhone(withoutCode);
}

function schemaFor(columns: ColumnDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const c of columns) {
    if (c.formHidden) continue;

    if (c.multiple) {
      let schema = z.string().trim();
      if (c.required) schema = schema.min(1, `${c.label} is required`);
      shape[c.key] = schema.max(1000, `${c.label} is too long`);
      continue;
    }

    if (c.type === "phone") {
      const phoneBase = z.string().trim();
      const getIndiaDigits = (v: string) => {
        const digits = v.replace(/\D/g, "");
        return digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
      };
      const schema = c.required
        ? phoneBase.refine((v) => INDIA_PHONE_REGEX.test(getIndiaDigits(v)), {
            message: `${c.label} must be a valid 10-digit Indian number`,
          })
        : phoneBase.refine((v) => !v || INDIA_PHONE_REGEX.test(getIndiaDigits(v)), {
            message: `Enter a valid 10-digit Indian phone number`,
          });
      shape[c.key] = schema;
      continue;
    }

    if (c.type === "email") {
      let stringSchema = z.string().trim();
      if (c.required) stringSchema = stringSchema.min(1, `${c.label} is required`);
      shape[c.key] = stringSchema.refine((v) => !v || EMAIL_REGEX.test(v), {
        message: "Enter a valid email address",
      });
      continue;
    }

    let baseString = z.string().trim();
    if (c.required) baseString = baseString.min(1, `${c.label} is required`);
    baseString = baseString.max(200, `${c.label} must be under 200 characters`);

    let base: z.ZodTypeAny = baseString;
    if (c.type === "number" || c.type === "percent") {
      base = baseString.refine((v) => !v || /^\d+(\.\d+)?%?$/.test(v), {
        message: `${c.label} must be a number`,
      });
    }

    shape[c.key] = base;
  }

  return z.object(shape);
}

interface FieldProps {
  column: ColumnDef;
  value: string;
  error?: string | undefined;
  touched: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  inputRef: (el: HTMLElement | null) => void;
}

type SelectOption = { label: string; value: string };

const selectStyles: StylesConfig<SelectOption, boolean> = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderRadius: 6,
    borderColor: state.isFocused ? "var(--ring)" : "var(--input)",
    boxShadow: state.isFocused
      ? "0 0 0 2px color-mix(in oklab, var(--ring) 20%, transparent)"
      : "none",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    transition: "all 150ms ease",
    "&:hover": { borderColor: "var(--ring)" },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 80,
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    overflow: "hidden",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "var(--primary)"
      : state.isFocused
        ? "color-mix(in oklab, var(--accent) 75%, transparent)"
        : "transparent",
    color: state.isSelected ? "var(--primary-foreground)" : "var(--foreground)",
    cursor: "pointer",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "color-mix(in oklab, var(--primary) 12%, transparent)",
    borderRadius: 5,
  }),
  multiValueLabel: (base) => ({ ...base, color: "var(--primary)" }),
};

function Field({ column, value, error, touched, onChange, onBlur, inputRef }: FieldProps) {
  const invalid = Boolean(error) && touched;
  const valid = !error && touched && value.length > 0;
  const id = `field-${column.key}`;
  const describedBy = invalid ? `${id}-error` : undefined;

  const options = useMemo<SelectOption[]>(
    () => (column.options ?? []).map((o) => ({ label: o, value: o })),
    [column.options],
  );

  const selectControl = column.options?.length ? (
    <Select<SelectOption, boolean>
      inputId={id}
      isMulti={Boolean(column.multiple)}
      isSearchable
      options={options}
      value={
        column.multiple
          ? options.filter((option) =>
              value
                .split(",")
                .map((v) => v.trim())
                .includes(option.value),
            )
          : (options.find((option) => option.value === value) ?? null)
      }
      onChange={(selected: MultiValue<SelectOption> | SingleValue<SelectOption>) => {
        if (column.multiple) {
          const next = (selected as MultiValue<SelectOption>).map((item) => item.value).join(", ");
          onChange(next);
        } else {
          onChange((selected as SingleValue<SelectOption>)?.value ?? "");
        }
      }}
      onBlur={onBlur}
      placeholder={`Select ${column.label.toLowerCase()}${column.multiple ? " (search and select)" : ""}`}
      styles={{
        ...selectStyles,
        control: (base, state) => ({
          ...selectStyles.control!(base, state),
          borderColor: invalid
            ? "var(--destructive)"
            : state.isFocused
              ? "var(--ring)"
              : "var(--input)",
          boxShadow: invalid
            ? "0 0 0 1px color-mix(in oklab, var(--destructive) 30%, transparent)"
            : state.isFocused
              ? "0 0 0 2px color-mix(in oklab, var(--ring) 20%, transparent)"
              : "none",
        }),
      }}
      className={cn(invalid && "rounded-md")}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      ref={(instance) => inputRef(instance?.inputRef ?? null)}
    />
  ) : null;

  const phoneControl =
    column.type === "phone" ? (
      <div
        className={cn(
          "flex w-full overflow-hidden rounded-md border bg-background transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
          invalid ? "border-destructive ring-1 ring-destructive/30" : "border-input",
          valid && "border-primary/60",
        )}
      >
        <div className="flex shrink-0 items-center gap-1 border-r bg-muted/40 px-3 text-sm font-medium text-foreground">
          <span aria-hidden="true">🇮🇳</span>
          {INDIA_CODE}
        </div>
        <Input
          id={id}
          ref={inputRef as (el: HTMLInputElement | null) => void}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          value={displayDigits(value)}
          onChange={(e) => {
            const digits = normalizePhone(e.target.value);
            onChange(digits ? `${INDIA_CODE}${digits}` : "");
          }}
          onBlur={onBlur}
          placeholder="9876543210"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn("border-0 shadow-none focus-visible:ring-0", invalid && "text-destructive")}
        />
      </div>
    ) : null;

  const control =
    selectControl ??
    phoneControl ??
    (column.fieldType === "textarea" ? (
      <Textarea
        id={id}
        ref={inputRef as (el: HTMLTextAreaElement | null) => void}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={3}
        placeholder={column.placeholder ?? `Enter ${column.label.toLowerCase()}`}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(
          "transition-colors",
          invalid
            ? "border-destructive ring-1 ring-destructive/30"
            : valid
              ? "border-primary/60"
              : undefined,
        )}
      />
    ) : (
      <Input
        id={id}
        ref={inputRef as (el: HTMLInputElement | null) => void}
        type={
          column.type === "date"
            ? "date"
            : column.type === "email"
              ? "email"
              : column.type === "number" || column.type === "percent"
                ? "text"
                : "text"
        }
        inputMode={column.type === "number" || column.type === "percent" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={column.placeholder ?? `Enter ${column.label.toLowerCase()}`}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(
          "transition-colors",
          invalid
            ? "border-destructive ring-1 ring-destructive/30"
            : valid
              ? "border-primary/60"
              : undefined,
        )}
      />
    ));

  return (
    <div className={cn("min-w-0 space-y-1.5", column.fieldType === "textarea" && "sm:col-span-2")}>
      <label htmlFor={id} className="flex items-center gap-1 text-sm font-medium text-foreground">
        {column.label}
        {column.required ? <span className="font-bold text-destructive">*</span> : null}
      </label>
      <div className="relative">
        {control}
        {valid && !column.multiple && column.type !== "phone" ? (
          <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        ) : null}
      </div>
      {invalid ? (
        <p
          id={`${id}-error`}
          className="flex items-center gap-1 text-xs font-medium text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : column.help ? (
        <p className="text-xs text-muted-foreground">{column.help}</p>
      ) : null}
    </div>
  );
}

interface FormBuilderProps {
  columns: ColumnDef[];
  initialValues?: Partial<FormValues>;
  submitLabel?: string;
  onSubmit: (values: FormValues) => void | Promise<void>;
  onCancel?: () => void;
}

export function FormBuilder({
  columns,
  initialValues,
  submitLabel = "Save",
  onSubmit,
  onCancel,
}: FormBuilderProps) {
  const fields = useMemo(() => columns.filter((c) => !c.formHidden), [columns]);
  const schema = useMemo(() => schemaFor(columns), [columns]);
  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(fields.map((c) => [c.key, String(initialValues?.[c.key] ?? "")])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const validate = (next: FormValues) => {
    const result = schema.safeParse(next);
    if (result.success) return {};
    const map: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!map[key]) map[key] = issue.message;
    }
    return map;
  };

  useEffect(() => {
    setErrors(validate(values));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const handleChange = (key: string, nextValue: string) => {
    setValues((prev) => ({ ...prev, [key]: nextValue }));
    if (touched[key]) {
      const next = { ...values, [key]: nextValue };
      setErrors((prev) => {
        const nextErrors = { ...prev };
        const fieldError = validate(next)[key];
        if (fieldError) nextErrors[key] = fieldError;
        else delete nextErrors[key];
        return nextErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const map = validate(values);
    setErrors(map);
    const allTouched = Object.fromEntries(fields.map((c) => [c.key, true]));
    setTouched(allTouched);

    const firstInvalid = fields.find((c) => map[c.key]);
    if (firstInvalid) {
      const el = refs.current[firstInvalid.key];
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError) {
        const serverErrors: Record<string, string> = {};
        for (const item of error.fieldErrors) {
          const separator = item.indexOf(":");
          if (separator > 0) {
            const key = item.slice(0, separator).trim();
            if (fields.some((field) => field.key === key)) {
              serverErrors[key] = item.slice(separator + 1).trim();
            }
          }
        }
        if (Object.keys(serverErrors).length) {
          setErrors((prev) => ({ ...prev, ...serverErrors }));
          setTouched((prev) => ({
            ...prev,
            ...Object.fromEntries(Object.keys(serverErrors).map((key) => [key, true])),
          }));
          const firstKey = fields.find((field) => serverErrors[field.key])?.key;
          if (firstKey) {
            refs.current[firstKey]?.focus();
            refs.current[firstKey]?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
        setSubmitError(error.message);
      } else {
        setSubmitError(
          error instanceof Error ? error.message : "Something went wrong. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const errorCount = Object.keys(errors).filter((k) => touched[k]).length;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errorCount > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Please fix {errorCount} field{errorCount > 1 ? "s" : ""} highlighted below.
          </span>
        </div>
      ) : null}

      {submitError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Unable to save this form</p>
              <p className="mt-0.5 text-xs opacity-90">{submitError}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        {fields.map((c) => (
          <Field
            key={c.key}
            column={c}
            value={values[c.key] ?? ""}
            error={errors[c.key]}
            touched={Boolean(touched[c.key])}
            onChange={(v) => handleChange(c.key, v)}
            onBlur={() => setTouched((prev) => ({ ...prev, [c.key]: true }))}
            inputRef={(el) => {
              refs.current[c.key] = el;
            }}
          />
        ))}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} className="sm:w-32">
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting} className="sm:w-40">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
