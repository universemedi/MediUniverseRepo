import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark";

export interface ThemeState {
  mode: ThemeMode;
  /** hex values driving the global CSS variables */
  primary: string;
  background: string;
  foreground: string;
  radius: number;
  density: "comfortable" | "compact";
  sidebarCollapsed: boolean;
}

export const THEME_PRESETS: Array<{
  name: string;
  primary: string;
  background: string;
  foreground: string;
}> = [
  { name: "Clinical Teal", primary: "#0F766E", background: "#F0FDFA", foreground: "#0F172A" },
  { name: "Medical Blue", primary: "#1D4ED8", background: "#F8FAFC", foreground: "#0B1220" },
  { name: "Indigo Mint", primary: "#4F46E5", background: "#F5F6FA", foreground: "#141432" },
  { name: "Emerald", primary: "#047857", background: "#F6FBF8", foreground: "#0B1F17" },
  { name: "Rose", primary: "#BE123C", background: "#FFF7F8", foreground: "#1B0B10" },
];

const initialState: ThemeState = {
  mode: "light",
  primary: "#0F766E",
  background: "#F0FDFA",
  foreground: "#0F172A",
  radius: 10,
  density: "comfortable",
  sidebarCollapsed: false,
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
    toggleMode(state) {
      state.mode = state.mode === "light" ? "dark" : "light";
    },
    setPrimary(state, action: PayloadAction<string>) {
      state.primary = action.payload;
    },
    setBackground(state, action: PayloadAction<string>) {
      state.background = action.payload;
    },
    setForeground(state, action: PayloadAction<string>) {
      state.foreground = action.payload;
    },
    setRadius(state, action: PayloadAction<number>) {
      state.radius = action.payload;
    },
    setDensity(state, action: PayloadAction<ThemeState["density"]>) {
      state.density = action.payload;
    },
    applyPreset(state, action: PayloadAction<string>) {
      const preset = THEME_PRESETS.find((p) => p.name === action.payload);
      if (preset) {
        state.primary = preset.primary;
        state.background = preset.background;
        state.foreground = preset.foreground;
      }
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    resetTheme() {
      return initialState;
    },
  },
});

export const {
  setMode,
  toggleMode,
  setPrimary,
  setBackground,
  setForeground,
  setRadius,
  setDensity,
  applyPreset,
  toggleSidebar,
  resetTheme,
} = themeSlice.actions;
export default themeSlice.reducer;
