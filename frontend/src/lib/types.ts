/** Mirrors the backend's DTO records (com.MediUnivers.service.dto.*) so the shapes never drift silently. */

export interface OrgTypeApiDto {
  id: number;
  code: string;
  name: string;
  description: string;
  modules: string[];
}

export interface PlanApiDto {
  id: number;
  code: string;
  name: string;
  priceLabel: string;
  tagline: string;
  maxBranches: number;
  maxUsers: number;
  storageLabel: string;
  modules: string[];
  highlights: string[];
}

export interface BranchApiDto {
  id: number;
  name: string;
  headOffice: boolean;
}

export interface OrganizationApiDto {
  id: number;
  name: string;
  subdomain: string | null;
  orgType: OrgTypeApiDto;
  plan: PlanApiDto;
  status:
    | "DRAFT"
    | "PENDING_VERIFICATION"
    | "TRIAL"
    | "ACTIVE"
    | "GRACE_PERIOD"
    | "SUSPENDED"
    | "CANCELLED"
    | "ARCHIVED";
  renewsOn: string | null;
  branches: BranchApiDto[];
}

export interface RoleApiDto {
  id: number;
  code: string;
  name: string;
  portal: "PLATFORM" | "TENANT" | "PATIENT";
  description: string;
  system: boolean;
  organizationId: number | null;
  actions: string[];
  access: Record<string, "*" | string[]>;
}

export interface MeResponse {
  userId: number;
  name: string;
  email: string;
  portal: "PLATFORM" | "TENANT" | "PATIENT";
  role: RoleApiDto;
  organization: OrganizationApiDto | null;
  branchName: string | null;
  branchId: number | null;
}
