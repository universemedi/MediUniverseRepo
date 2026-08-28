import { Palette, RotateCcw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  THEME_PRESETS,
  applyPreset,
  resetTheme,
  setBackground,
  setDensity,
  setForeground,
  setMode,
  setPrimary,
  setRadius,
} from "@/store/slices/themeSlice";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase text-muted-foreground">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded-md border border-border bg-background p-0.5"
          aria-label={label}
        />
      </div>
    </div>
  );
}

export function ThemePanel() {
  const theme = useAppSelector((s) => s.theme);
  const dispatch = useAppDispatch();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Theme settings">
          <Palette className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Appearance</SheetTitle>
          <SheetDescription>Global theme — applies to every page instantly.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["light", "dark"] as const).map((m) => (
                <Button
                  key={m}
                  variant={theme.mode === m ? "default" : "outline"}
                  onClick={() => dispatch(setMode(m))}
                  className="capitalize"
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {THEME_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => dispatch(applyPreset(p.name))}
                  className={cn(
                    "flex items-center gap-2 rounded-md border border-border p-2 text-left text-xs transition-colors hover:bg-accent",
                    theme.primary.toLowerCase() === p.primary.toLowerCase() &&
                      "border-primary ring-1 ring-primary",
                  )}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded-full"
                    style={{ background: p.primary }}
                  />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Colors</Label>
            <ColorField
              label="Primary"
              value={theme.primary}
              onChange={(v) => dispatch(setPrimary(v))}
            />
            <ColorField
              label="Background"
              value={theme.background}
              onChange={(v) => dispatch(setBackground(v))}
            />
            <ColorField
              label="Text"
              value={theme.foreground}
              onChange={(v) => dispatch(setForeground(v))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Corner radius</Label>
              <span className="text-xs text-muted-foreground">{theme.radius}px</span>
            </div>
            <Slider
              value={[theme.radius]}
              min={0}
              max={20}
              step={1}
              onValueChange={([v]) => dispatch(setRadius(v ?? 10))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Table density
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(["comfortable", "compact"] as const).map((d) => (
                <Button
                  key={d}
                  variant={theme.density === d ? "default" : "outline"}
                  onClick={() => dispatch(setDensity(d))}
                  className="capitalize"
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>

          <Button variant="ghost" className="w-full" onClick={() => dispatch(resetTheme())}>
            <RotateCcw className="h-4 w-4" />
            Reset to default
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
