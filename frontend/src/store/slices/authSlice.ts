import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RoleKey, Portal } from "@/lib/rbac";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  organization: string;
  orgId?: string | number | undefined;
  orgType?: string | undefined;
  planCode?: string | undefined;
  portal?: Portal | undefined;
  branch: string;
  avatar?: string | undefined;
  permissions?: string[] | undefined;
}

interface AuthState {
  user: AuthUser | null;
  /** The role the backend actually issued this session's JWT for — never changed by the preview switcher */
  authenticatedRole: RoleKey | null;
  token: string | null;
  status: "idle" | "loading" | "authenticated";
}

const initialState: AuthState = {
  user: null,
  authenticatedRole: null,
  token: null,
  status: "idle",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart(state) {
      state.status = "loading";
    },
    loginSuccess(state, action: PayloadAction<{ user: AuthUser; token?: string | undefined }>) {
      state.user = action.payload.user;
      state.authenticatedRole = action.payload.user.role;
      state.token = action.payload.token ?? "backend-jwt-session";
      state.status = "authenticated";
    },
    /** UI-preview only — does NOT change what the backend's real JWT grants */
    setRole(state, action: PayloadAction<RoleKey>) {
      if (state.user) {
        state.user.role = action.payload;
      }
    },
    setBranch(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.branch = action.payload;
      }
    },
    updateUserProfile(state, action: PayloadAction<Partial<AuthUser>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    logout(state) {
      state.user = null;
      state.authenticatedRole = null;
      state.token = null;
      state.status = "idle";
    },
  },
});

export const { loginStart, loginSuccess, setRole, setBranch, updateUserProfile, logout } =
  authSlice.actions;

export default authSlice.reducer;
