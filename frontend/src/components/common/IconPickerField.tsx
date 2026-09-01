import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { ICON_OPTIONS } from "@/lib/iconOptions";
import { resolveIcon } from "@/lib/iconMap";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface IconPickerFieldProps {
  label: string;
  value: string;
  onChange: (name: string) => void;
  id?: string;
}

/** A searchable "pick an icon" dropdown — shows every option as its actual rendered
 * icon plus name, instead of making an admin guess and type a lucide-react name blind. */
export function IconPickerField({ label, value, onChange, id }: IconPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const SelectedIcon = resolveIcon(value || null);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2">
              <SelectedIcon className="h-4 w-4 text-muted-foreground" />
              {value || "Choose an icon…"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search icons..." />
            <CommandList>
              <CommandEmpty>No matching icon.</CommandEmpty>
              <CommandGroup>
                {ICON_OPTIONS.map((name) => {
                  const OptionIcon = resolveIcon(name);
                  return (
                    <CommandItem
                      key={name}
                      value={name}
                      onSelect={() => {
                        onChange(name);
                        setOpen(false);
                      }}
                      className={cn("gap-2", name === value && "bg-accent text-accent-foreground")}
                    >
                      <OptionIcon className="h-4 w-4" />
                      {name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
