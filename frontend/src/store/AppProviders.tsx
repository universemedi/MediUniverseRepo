import { useEffect, useRef, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, useAppSelector, type AppStore } from "@/store";

const STORAGE_KEY = "mediunivers.theme";

/** Convert hex -> "L C H" oklch-compatible string via sRGB conversion. */
function hexToOklch(hex: string): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return `${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)}`;
}

function mix(a: string, b: string, ratio: number) {
  return `color-mix(in oklab, oklch(${a}) ${Math.round(ratio * 100)}%, oklch(${b}))`;
}

function ThemeApplier() {
  const theme = useAppSelector((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme.mode === "dark");

    const primary = hexToOklch(theme.primary);
    const bg = hexToOklch(theme.mode === "dark" ? "#0B1220" : theme.background);
    const fg = hexToOklch(theme.mode === "dark" ? "#E8F5F2" : theme.foreground);
    const white = "1 0 0";
    const near = theme.mode === "dark" ? "0.20 0.02 240" : "1 0 0";

    root.style.setProperty("--primary", `oklch(${primary})`);
    root.style.setProperty(
      "--primary-foreground",
      theme.mode === "dark" ? `oklch(0.16 0.02 200)` : `oklch(${white})`,
    );
    root.style.setProperty("--ring", `oklch(${primary})`);
    root.style.setProperty("--sidebar-primary", `oklch(${primary})`);
    root.style.setProperty("--background", `oklch(${bg})`);
    root.style.setProperty("--foreground", `oklch(${fg})`);
    root.style.setProperty("--card", `oklch(${near})`);
    root.style.setProperty("--card-foreground", `oklch(${fg})`);
    root.style.setProperty("--popover", `oklch(${near})`);
    root.style.setProperty("--popover-foreground", `oklch(${fg})`);
    root.style.setProperty("--sidebar", `oklch(${near})`);
    root.style.setProperty("--sidebar-foreground", `oklch(${fg})`);
    root.style.setProperty("--accent", mix(primary, bg, 0.12));
    root.style.setProperty("--accent-foreground", `oklch(${primary})`);
    root.style.setProperty("--secondary", mix(primary, bg, 0.08));
    root.style.setProperty("--secondary-foreground", `oklch(${primary})`);
    root.style.setProperty("--muted", mix(fg, bg, 0.05));
    root.style.setProperty("--border", mix(fg, bg, theme.mode === "dark" ? 0.16 : 0.1));
    root.style.setProperty("--input", mix(fg, bg, theme.mode === "dark" ? 0.2 : 0.14));
    root.style.setProperty("--radius", `${theme.radius / 16}rem`);
    root.style.setProperty("--row-py", theme.density === "compact" ? "0.45rem" : "0.75rem");
    root.style.setProperty("--brand", `oklch(${primary})`);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  return null;
}

function Hydrator({ store }: { store: AppStore }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, unknown>;
      store.dispatch({ type: "theme/hydrate", payload: saved });
      if (typeof saved["mode"] === "string")
        store.dispatch({ type: "theme/setMode", payload: saved["mode"] });
      if (typeof saved["primary"] === "string")
        store.dispatch({ type: "theme/setPrimary", payload: saved["primary"] });
      if (typeof saved["background"] === "string")
        store.dispatch({ type: "theme/setBackground", payload: saved["background"] });
      if (typeof saved["foreground"] === "string")
        store.dispatch({ type: "theme/setForeground", payload: saved["foreground"] });
      if (typeof saved["radius"] === "number")
        store.dispatch({ type: "theme/setRadius", payload: saved["radius"] });
      if (typeof saved["density"] === "string")
        store.dispatch({ type: "theme/setDensity", payload: saved["density"] });
    } catch {
      /* ignore */
    }
  }, [store]);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  storeRef.current ??= makeStore();

  return (
    <Provider store={storeRef.current}>
      <Hydrator store={storeRef.current} />
      <ThemeApplier />
      {children}
    </Provider>
  );
}
