/** Mirrors the backend's DTO records (com.MediUnivers.service.dto.*) so the shapes never drift silently. */

export interface OrgTypeApiDto {
  id: number;
  code: string;
  name: string;
  description: string;
  modules: string[];
  active: boolean;
}

export interface PlanApiDto {
  id: number;
  code: string;
  name: string;
  priceLabel: string;
  tagline: string;
  maxBranches: number;
  maxUsers: number;
  maxDoctorsPerBranch: number;
  storageLabel: string;
  priceWithoutTax: number;
  taxPercent: number;
  priceWithTax: number;
  /** Null when this plan isn't offered yearly yet — checkout falls back to priceWithoutTax x 12. */
  priceWithoutTaxYearly: number | null;
  priceWithTaxYearly: number | null;
  freeTrial: boolean;
  freeTrialDays: number;
  active: boolean;
  /** The plan pre-selected on the public site's plan picker — at most one plan is ever true. */
  defaultSelected: boolean;
  /** Availability window for new signups — null means always available (ISO date strings). */
  validFrom: string | null;
  validTo: string | null;
  modules: string[];
  highlights: string[];
}

export interface ModulePriceApiDto {
  moduleGroup: string;
  label: string;
  pricePerMonth: number;
  active: boolean;
}

export interface AddonPricingApiDto {
  addonType: string;
  label: string;
  quantityBased: boolean;
  unitLabel: string | null;
  pricePerUnitMonthly: number;
  pricePerUnitYearly: number | null;
  active: boolean;
}

export interface SubscriptionAddonApiDto {
  addonType: string;
  label: string;
  quantityBased: boolean;
  unitLabel: string | null;
  quantity: number;
  unitPriceWithTax: number;
  lineTotalWithTax: number;
}

export interface SubscriptionApiDto {
  id: number;
  organizationId: number;
  organizationName: string;
  planCode: string;
  planName: string;
  startDate: string;
  endDate: string | null;
  freeTrial: boolean;
  freeTrialDays: number | null;
  priceWithoutTax: number;
  taxPercent: number;
  priceWithTax: number;
  status: "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUPERSEDED";
}

export interface LeadApiDto {
  id: number;
  source: string;
  name: string;
  email: string;
  phone: string | null;
  organizationName: string | null;
  organizationType: string | null;
  city: string | null;
  state: string | null;
  expectedBranches: number | null;
  expectedUsers: number | null;
  modulesOfInterest: string | null;
  preferredDemoDate: string | null;
  message: string | null;
  internalNotes: string | null;
  assignedToUserId: number | null;
  assignedToName: string | null;
  status: "NEW_LEAD" | "CONTACTED" | "DEMO_SCHEDULED" | "DEMO_COMPLETED" | "WON" | "LOST";
  createdAt: string;
  updatedAt: string;
}

export interface PlatformStaffApiDto {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  roleCode: string;
  roleName: string;
  status: "ACTIVE" | "INVITED" | "DISABLED";
}

export interface CouponApiDto {
  id: number;
  code: string;
  discountPercent: number;
  validFrom: string | null;
  validTo: string | null;
  planCodes: string[];
  usageCount: number;
  active: boolean;
}

export interface ReferralCodeApiDto {
  id: number;
  code: string;
  organizationId: number;
  organizationName: string;
  rewardAmount: number;
  signupCount: number;
  enabled: boolean;
}

export interface SupportTicketApiDto {
  id: number;
  code: string;
  subject: string;
  organizationId: number | null;
  organizationName: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ownerId: number | null;
  ownerName: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
}

export interface AuditLogApiDto {
  id: number;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  organizationId: number | null;
  organizationName: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface BranchApiDto {
  id: number;
  name: string;
  headOffice: boolean;
}

export interface OrganizationApiDto {
  id: number;
  organizationCode: string;
  slug: string;
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
  creationSource: string;
  renewsOn: string | null;
  branches: BranchApiDto[];
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  timezone: string | null;
  currency: string | null;
  gstNumber: string | null;
  registrationNumber: string | null;
  website: string | null;
  logoUrl: string | null;
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

export interface MyNotificationApiDto {
  id: number;
  eventType: string;
  subject: string | null;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface MyProfileApiDto {
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
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

/** MediUnivers' own site config — the same shape is used both for the Super Admin's
 * editor (GET/PUT /api/platform/website-config) and the public read
 * (GET /api/public/platform-site), since nothing in it is sensitive. */
export interface PlatformSiteConfigDto {
  templateId: number | null;
  published: boolean;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string | null;
  backgroundColor: string | null;
  textSizeScale: string;
  tagline: string | null;
  heroHeading: string | null;
  heroSubheading: string | null;
  aboutContent: string | null;
  missionContent: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  bannersJson: string | null;
  navItemsJson: string | null;
  footerColumnsJson: string | null;
  statsJson: string | null;
  privacyContent: string | null;
  termsContent: string | null;
  securityContent: string | null;
  pageBannersJson: string | null;
  homeCarouselJson: string | null;
  heroVideoUrl: string | null;
}

export interface PlatformSiteStat {
  label: string;
  value: string;
}

export interface PlatformTestimonialDto {
  id: number;
  name: string;
  roleCompany: string | null;
  message: string;
  rating: number;
  photoUrl: string | null;
  sortOrder: number;
  published: boolean;
}

export type PlatformContentSection = "FEATURE" | "SOLUTION" | "VALUE" | "TEAM";

export interface PlatformContentCardDto {
  id: number;
  section: PlatformContentSection;
  icon: string | null;
  title: string;
  tag: string | null;
  description: string | null;
  bulletsText: string | null;
  sortOrder: number;
  published: boolean;
}

export interface PlatformCommunicationSettingsDto {
  emailEnabled: boolean;
  emailConfigJson: string | null;
  emailPasswordConfigured: boolean;
  smsEnabled: boolean;
  smsConfigJson: string | null;
  smsKeyConfigured: boolean;
}

export interface PlatformNotificationTemplateDto {
  id: number;
  eventType: string;
  channel: string;
  name: string;
  subject: string | null;
  body: string;
  supportedVariables: string | null;
  active: boolean;
}

export interface PlatformNotificationDto {
  id: number;
  eventType: string;
  channel: string;
  priority: string;
  status: string;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  subject: string | null;
  body: string;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface PlatformBlogPostDto {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  author: string | null;
  published: boolean;
  createdAt: string;
  publishedAt: string | null;
}

export interface PlatformDashboardStatsApiDto {
  activeOrganizations: number;
  newOrganizationsLast30Days: number;
  openDemoRequests: number;
  newDemoRequestsLast30Days: number;
  organizationsExpiringWithin30Days: number;
  demoConversionRatePercent: number | null;
  revenueVisible: boolean;
  subscriptionRevenueThisMonth: number | null;
  subscriptionRevenueLastMonth: number | null;
}

export interface ChartRow {
  name: string;
  [seriesKey: string]: string | number;
}

export interface ExpiringOrganizationApiDto {
  id: number;
  name: string;
  planName: string | null;
  renewsOn: string;
  daysLeft: number;
}

export interface PlatformDashboardApiDto {
  stats: PlatformDashboardStatsApiDto;
  organizationsExpiringSoon: ExpiringOrganizationApiDto[];
  modulePopularity: ChartRow[];
  demoConversionTrend: ChartRow[];
  subscriptionTypeMix: ChartRow[];
  subscriptionRevenueTrend: ChartRow[];
}

export interface ClinicDashboardApiDto {
  todaysAppointments: number;
  checkedIn: number;
  inConsultation: number;
  completedToday: number;
  totalPatients: number;
  totalDoctors: number;
}

export interface PharmacyDashboardApiDto {
  pendingPrescriptions: number;
  todaysSalesCount: number;
  todaysRevenue: number;
  lowStockCount: number;
  expiringSoonCount: number;
}

export interface LabDashboardApiDto {
  todaysOrders: number;
  pendingCollection: number;
  pendingResults: number;
  pendingVerification: number;
  completedReports: number;
  rejectedSamples: number;
}

export interface BillingDashboardApiDto {
  unpaidInvoices: number;
  totalOutstanding: number;
  todaysInvoices: number;
  todaysCollections: number;
}
