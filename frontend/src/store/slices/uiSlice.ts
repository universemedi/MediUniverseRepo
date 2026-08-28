import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface TableState {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string | null;
  sortDir: "asc" | "desc";
}

interface UiState {
  /** per-table persisted state keyed by table id */
  tables: Record<string, TableState>;
  commandOpen: boolean;
  themePanelOpen: boolean;
}

export const defaultTableState: TableState = {
  page: 1,
  pageSize: 10,
  search: "",
  sortBy: null,
  sortDir: "asc",
};

const initialState: UiState = { tables: {}, commandOpen: false, themePanelOpen: false };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTableState(state, action: PayloadAction<{ id: string; patch: Partial<TableState> }>) {
      const current = state.tables[action.payload.id] ?? defaultTableState;
      state.tables[action.payload.id] = { ...current, ...action.payload.patch };
    },
    resetTable(state, action: PayloadAction<string>) {
      state.tables[action.payload] = defaultTableState;
    },
    setCommandOpen(state, action: PayloadAction<boolean>) {
      state.commandOpen = action.payload;
    },
    setThemePanelOpen(state, action: PayloadAction<boolean>) {
      state.themePanelOpen = action.payload;
    },
  },
});

export const { setTableState, resetTable, setCommandOpen, setThemePanelOpen } = uiSlice.actions;
export default uiSlice.reducer;
export type { TableState };
