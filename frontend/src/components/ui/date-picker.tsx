import * as React from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  id?: string;
  /** ISO date string (yyyy-MM-dd), or null/undefined when empty. */
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: string | undefined;
  max?: string | undefined;
  invalid?: boolean;
  "aria-describedby"?: string;
}

/** Friendly calendar-popover date picker — used wherever a form needs a single date, instead of the bare native `<input type="date">`. */
export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  {
    id,
    value,
    onChange,
    placeholder = "Pick a date",
    disabled,
    min,
    max,
    invalid,
    "aria-describedby": ariaDescribedBy,
  },
  ref,
) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? parseISO(value) : undefined;
  const minDate = min ? parseISO(min) : undefined;
  const maxDate = max ? parseISO(max) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-9 w-full justify-start px-3 text-left font-normal",
            !value && "text-muted-foreground",
            invalid && "border-destructive text-destructive focus-visible:ring-destructive",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selected ? format(selected, "dd MMM yyyy") : placeholder}
          {value ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear date"
              className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          {...(selected ? { defaultMonth: selected } : minDate ? { defaultMonth: minDate } : {})}
          disabled={
            minDate && maxDate
              ? { before: minDate, after: maxDate }
              : minDate
                ? { before: minDate }
                : maxDate
                  ? { after: maxDate }
                  : undefined
          }
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : null);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
});
