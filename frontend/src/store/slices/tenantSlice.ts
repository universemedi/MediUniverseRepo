import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { GroupAccess } from "@/lib/rbac";
import type { OrganizationApiDto } from "@/lib/types";

export interface CustomRole {
  key: string;
  name: string;
  description: string;
  access: GroupAccess;
  actions: string[];
  users: number;
}

interface TenantState {
  /** the subscribed organization the current tenant user belongs to */
  orgName: string;
  /** business line — what kind of org this is (clinic / pharmacy / lab, in any combination) */
  orgTypeCode: string;
  planCode: string;
  status:
    | "DRAFT"
    | "PENDING_VERIFICATION"
    | "TRIAL"
    | "ACTIVE"
    | "GRACE_PERIOD"
    | "SUSPENDED"
    | "CANCELLED"
    | "ARCHIVED";
  renewsOn: string;
  branches: string[];
  /** same branches, with real backend IDs — needed for API calls like creating a user in a branch */
  branchRecords: { id: number; name: string; headOffice: boolean }[];
  customRoles: CustomRole[];
}

const initialState: TenantState = {
  orgName: "Sunrise Multispeciality",
  orgTypeCode: "MULTI_SPECIALITY",
  planCode: "PROFESSIONAL",
  status: "ACTIVE",
  renewsOn: "2026-09-01",
  branches: ["Head Office", "Andheri Branch", "Bandra Branch", "Pune Central"],
  branchRecords: [],
  customRoles: [
    {
      key: "CUSTOM_FRONT_DESK_LEAD",
      name: "Front Desk Lead",
      description: "Created by the org admin — reception plus billing oversight.",
      access: {
        clinic: ["clinic/reception", "clinic/queue", "clinic/appointments", "clinic/billing"],
        org: ["org/users"],
      },
      actions: ["view", "create", "update", "export"],
      users: 3,
    },
  ],
};

const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {
    setPlan(state, action: PayloadAction<string>) {
      state.planCode = action.payload;
    },
    setOrgType(state, action: PayloadAction<string>) {
      state.orgTypeCode = action.payload;
    },
    setOrgName(state, action: PayloadAction<string>) {
      state.orgName = action.payload;
    },
    /** Replaces the demo/mock tenant state with the real organization returned by GET /api/me. */
    hydrateFromOrganization(state, action: PayloadAction<OrganizationApiDto>) {
      const org = action.payload;
      state.orgName = org.name;
      state.orgTypeCode = org.orgType.code;
      state.planCode = org.plan.code;
      state.status = org.status;
      state.renewsOn = org.renewsOn ?? state.renewsOn;
      state.branches = org.branches.map((b) => b.name);
      state.branchRecords = org.branches.map((b) => ({
        id: b.id,
        name: b.name,
        headOffice: b.headOffice,
      }));
    },
    upsertCustomRole(state, action: PayloadAction<CustomRole>) {
      const idx = state.customRoles.findIndex((r) => r.key === action.payload.key);
      if (idx >= 0) state.customRoles[idx] = action.payload;
      else state.customRoles.push(action.payload);
    },
    removeCustomRole(state, action: PayloadAction<string>) {
      state.customRoles = state.customRoles.filter((r) => r.key !== action.payload);
    },
  },
});

export const {
  setPlan,
  setOrgType,
  setOrgName,
  hydrateFromOrganization,
  upsertCustomRole,
  removeCustomRole,
} = tenantSlice.actions;
export default tenantSlice.reducer;
