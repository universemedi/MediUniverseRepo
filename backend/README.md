# MediUnivers Service (Backend)

Spring Boot 4.1 / Java 21 API for MediUnivers. This service **is** the OAuth2
provider the frontend authenticates against (Authorization Code + PKCE), a
Resource Server for `/api/**`, and owns the PostgreSQL schema for
organizations, plans, dynamic roles/permissions and users.

## Before you run it — important

`mvn clean compile` has been run and verified clean as of the Subscription
Engine / Website Template pass below (Flyway migrations V1–V18), including
live end-to-end verification against a real PostgreSQL instance (not just a
compile check) for every new flow: signup, payment-gateway integration,
password reset, and the trial-expiry cron. If a future change doesn't
compile, that's a regression, not an expected state.

## What's implemented (Phase 1 — Foundation)

- PostgreSQL schema via Flyway (`src/main/resources/db/migration/V1__init_core_schema.sql`):
  org types, plans, dynamic roles + permissions (module/action based), organizations,
  branches, users, public-website leads.
- **This service is its own OAuth2 Authorization Server** (`AuthorizationServerConfig`):
  Authorization Code + PKCE, one public client (`mediunivers-web`, no secret — a SPA
  can't keep one safe), JWT access tokens signed with an RSA key, custom claims
  (`role`, `portal`, `org_id`, `org_type`, `plan_code`) stamped onto every token.
- **Resource Server** (`ResourceServerConfig`): everything under `/api/**` requires a
  valid bearer JWT except `/api/public/**`.
- **Server-side RBAC mirror** (`AccessService`) of the frontend's `usePermissions()`
  logic — org type → plan → role — so the API enforces the same rules the UI shows,
  not just a frontend illusion.
- **Dynamic organization creation** (`POST /api/platform/organizations`): pick an org
  type + a plan, and it creates the organization, a head branch, and an Org Owner
  login in one transaction.
- **Dynamic custom roles** (`POST /api/org/roles`): an org admin can define a role
  scoped to their organization; every module they grant it is checked against what
  their org type actually runs.
- **Module configuration is now a first-class, queryable concept** (`OrgModuleService`,
  `GET /api/org/modules`): each business module (Clinic, Pharmacy, Laboratory, CRM,
  Website) has an explicit status — available by org type, available by plan, and the
  effective `enabled` (both true) — matching spec rule #9, "Organizations inherit plan
  configuration". This is what the Org Owner's "Configure Modules" screen is built from,
  and what blocks a custom role from being handed out for a module the org hasn't
  actually got (`UserService.createOrgUser`, exempting system roles like Org Owner so
  the owner account itself is never blocked by its own plan).
- **Organization user management** (`GET`/`POST /api/org/users`): list and add staff,
  each assigned a role whose granted modules must currently be enabled for the org.

## What's implemented — Clinic module (Volume 3 Part 3 & 4)

- **Master Data Engine** (`Department`, `Specialization`, `NumberSeries`): the shared
  reference-data layer every business module reads from instead of inventing its own —
  platform defaults are read-only to organizations, who can add their own on top.
  `NumberSeriesService` is a real atomic, pessimistic-locked, reset-aware document
  numbering engine (patient numbers never reset, tokens reset daily, matching spec §19-23).
- **Patients** (`/api/clinic/patients`): registration (auto-generated patient number),
  search, profile, family members.
- **Doctors** (`/api/clinic/doctors`): creating a doctor also creates their login (Portal
  TENANT, role DOCTOR) in the same transaction; specializations pulled from the Master
  Data Engine; weekly availability editor.
- **Appointments** (`/api/clinic/appointments`): scheduled booking and walk-in check-in
  (walk-ins get an immediate daily-reset token), status transitions (booked → checked-in
  → in-consultation → completed/cancelled/no-show).
- **Consultations** (`/api/clinic/consultations`) — the EMR foundation: starting a
  consultation from a checked-in appointment, recording vitals/clinical notes/diagnosis/
  prescription/follow-up, completing it (which also completes the appointment).
- Every one of these is gated by `AccessService.requireModuleEnabled(org, CLINIC)` —
  Clinic is genuinely unreachable end-to-end if an org's business type or plan doesn't
  include it, not just hidden in the UI.

### Known simplifications in this pass
- The doctor's consultation queue currently shows every checked-in patient
  organization-wide rather than filtering to the signed-in doctor's own patients
  (`GET /api/clinic/doctors/me` exists for this but isn't wired into the frontend yet).
- Billing is not implemented — consultations and appointments don't yet generate an
  invoice; that's its own module per the roadmap.
- No `Consultation` history browse page in the UI yet, though the API
  (`GET /api/clinic/consultations/patient/{patientId}`) is there.

## What's implemented — Pharmacy module (Volume 4)

- **Master data additions**: `MedicineCategory`, `MedicineUnit`, `Manufacturer` — same
  platform-default-plus-org-custom pattern as Department/Specialization, seeded with the
  doc's example values.
- **Full domain model**: `Supplier`, `Medicine`, `Batch`, `PurchaseOrder`+items,
  `GoodsReceipt` (GRN)+items, `StockLedgerEntry` (append-only audit trail),
  `StockTransfer`+items, `PharmacySale`+items, `PharmacyReturn`+items — plus a
  `pharmacyStatus` field added to `Consultation` so the prescription queue is derived
  automatically from completed consultations, no separate queue table (matches spec §4,
  "no manual entry required").
- **Real FIFO/FEFO batch allocation** (`BatchRepository.lockAllocatableBatches`,
  pessimistic row-locked) shared between walk-in sales, prescription dispensing, and
  branch-to-branch stock transfers — oldest-expiring, non-expired, in-stock batches
  first, splitting across multiple batches automatically if one isn't enough.
- **Purchasing**: `PurchaseOrder` → `GoodsReceipt` (GRN), where receiving is what
  actually creates `Batch` rows and writes `StockLedgerEntry` movements; a PO's status
  advances to partially/fully received automatically as GRNs come in against it.
- **Sales**: `POST /api/pharmacy/sales/walk-in` (no patient required) and
  `POST /api/pharmacy/sales/dispense` (against a completed consultation) share the same
  cart → FIFO allocation → tax/discount calculation → stock-ledger-write pipeline. The
  sale record's shape (subtotal/discount/tax/grand total/payment mode) deliberately
  matches what a real Billing Engine invoice needs, per spec §15 ("Pharmacy never
  creates invoices directly") — swapping in a real Billing Engine later is a wiring
  change, not a rewrite.
- **Returns**: always against the original sale, quantity-capped per line
  (`quantityReturned` tracked on the sale item so the same medicine can't be
  over-returned across multiple return requests), non-expired stock is credited back.
- **Reorder & expiry alerts**: `GET /api/pharmacy/stock/low` (below reorder level, per
  branch) and `GET /api/pharmacy/stock/expiring` (configurable day window).
- Every endpoint gated by `AccessService.requireModuleEnabled(org, PHARMACY)`.

### Known simplifications in this pass
- Prescription-to-catalog matching is manual: `Consultation.prescriptionItems` are
  free-text (doctor writes "Amoxicillin 500mg"), so the pharmacist matches each line to
  a catalog `Medicine` by hand when dispensing — there's no fuzzy-matching or automatic
  linking yet.
- The "fully dispensed vs. partially dispensed" queue status is a line-count heuristic
  (prescribed lines vs. sale lines), not an exact per-medicine quantity reconciliation.
- No barcode/QR scanning, loyalty programs, or online ordering — explicitly deferred to
  a later phase per the doc's own Phase 1 simplification list.
- Controlled-medicine handling is a UI warning only (no separate authorization workflow
  or government compliance integration), matching the doc's "Phase 1: simple warning."

## What's implemented — Laboratory module (Volume 5, LIMS foundation)

- **Test Master** (`LabTest` + `LabReferenceRange`): test categories (platform default +
  org-custom, same Master Data pattern), tests with sample type/price/turnaround time,
  and per-test reference ranges by gender + age band, each with its own critical
  low/high thresholds.
- **Lab Orders** (`LabOrder` + `LabOrderItem`): created directly by reception, or from a
  doctor's consultation (`consultationId` on the order); status flow
  `SAMPLE_PENDING → COLLECTED → PROCESSING → RESULT_READY → VERIFIED`, advanced
  automatically as results are entered and verified rather than requiring a manual
  status click at every step.
- **Sample Collection**: one collection event per order (Phase 1 simplification — see
  below), generating a daily-reset collection number via the shared `NumberSeriesService`.
- **Result entry with automatic flagging** (`LabResultService.computeFlag`): a numeric
  result is compared against the matching reference range (by the patient's gender and
  age) and flagged LOW/NORMAL/HIGH/CRITICAL automatically; non-numeric ("Positive"/
  "Negative") results are accepted and flagged UNKNOWN rather than rejected.
- **Verification workflow**: technician enters, a separate role (Lab Manager/Org Admin/
  Owner) verifies — once verified, `LabResultService` refuses further edits to that
  result (spec §18, "results cannot be edited after verification").
- **Reports**: only available once every result on an order is verified (spec rule #10),
  served as structured data (`LabReportDto`) that a PDF renderer can sit on top of later
  without changing the contract — printing today uses the browser's print-to-PDF via a
  print-styled report view.
- Every endpoint gated by `AccessService.requireModuleEnabled(org, LAB)`.

### Known simplifications in this pass
- **One sample collection per order**, not per sample type — a real order needing both a
  blood draw and a urine sample is recorded as a single collection event noting both
  sample types in free text, rather than tracked as two independent specimens. This is a
  step beyond the doc's own Phase 1 scope, called out explicitly because it affects
  sample-tracking granularity.
- No barcode/QR, analyzer/HL7 integration, or home sample collection — explicitly
  deferred to a later phase per the doc.
- "Reopen a verified result" (mentioned in spec §18 as something an authorized user can
  do) isn't implemented — verified results are final in this pass.
- Report generation is data + browser print-to-PDF, not a dedicated PDF-rendering
  service — functionally equivalent for now, but not the same architecture a
  high-volume report-generation pipeline would eventually want.

## What's implemented — Centralized Billing Engine

- **A new, always-on module group** (`ModuleGroup.BILLING`): unlike Clinic/Pharmacy/Lab,
  billing isn't gated by organization type or subscription plan — every organization
  needs it regardless of tier, so `AccessService` and its frontend mirror
  (`usePermissions.ts`) treat it like `ORG`/`PATIENT`: always reachable once a role
  grants it, never blocked by "needs plan upgrade."
- **The core abstraction** (`BillingService.createInvoice(...)`): any module hands over
  an organization, branch, patient, a `SourceModule` tag, and a list of generic
  `InvoiceLineItemInput`s (description, `sourceType`/`sourceId` tracing the line back to
  whatever created it, quantity, price, discount, tax). The engine computes subtotal/
  discount/tax/grand total and persists the `Invoice` + `InvoiceLineItem`s. **Adding
  billing to a future module means adding one value to `SourceModule` and calling this
  same method — nothing else in the engine changes.**
- **`Invoice` + `Payment`**: an invoice can receive multiple partial payments across
  different modes (cash/UPI/card/bank transfer); status moves
  `UNPAID → PARTIALLY_PAID → PAID` automatically as payments are recorded, with a
  running `balanceDue` computed from `grandTotal - amountPaid`.
- **Real integration with all three existing modules**, not just a shared table sitting
  unused:
  - **Clinic** — completing a consultation now bills the doctor's consultation fee
    automatically (previously nothing was charged for a consultation at all).
  - **Laboratory** — creating a lab order now generates an invoice for the ordered tests
    at creation time (previously lab orders were entirely unbilled).
  - **Pharmacy** — the existing sale flow (walk-in and prescription dispensing) now
    creates a real `Invoice` through the engine and marks it paid immediately via
    `createPaidInvoice(...)`, replacing what used to be a sale record that only mimicked
    an invoice shape without a real one existing.
- `GET /api/billing/invoices` (filterable by status), `GET /api/billing/invoices/{id}`,
  `GET /api/billing/invoices/patient/{patientId}`, `POST /api/billing/invoices/{id}/payments`,
  `GET /api/billing/dashboard` (outstanding balance, today's collections).

## What's implemented — Configurable GST + Razorpay payment gateway

- **Tax Rule Engine** (`TaxRule`, Master Data pattern — platform defaults + org-custom):
  seeded with the standard Indian GST slabs (0/5/12/18/28%) as read-only platform
  defaults; an organization can add its own rate on top (a service tax, a local levy,
  whatever it needs). Exposed at `GET /api/public/tax-rules`, `GET /api/org/tax-rules`,
  `POST /api/org/tax-rules`.
- **GST is configurable in every billed module now, not just Pharmacy:**
  - **Pharmacy** — `Medicine.taxPercent` is the default rate, but
    `SaleCartItemInput.taxPercent` lets the rate be **overridden per cart line at the
    point of sale or dispensing** — exactly "at each prescription/entry level," not
    fixed forever on the medicine master.
  - **Laboratory** — `LabTest.taxPercent` (this was a genuine gap closed in this pass;
    lab orders had no GST at all before).
  - **Clinic** — `Doctor.taxPercent` applies GST to that doctor's consultation fee
    (also a gap closed in this pass — consultations were previously billed with no tax).
  - All three flow into `BillingService.createInvoice`'s tax calculation identically —
    there's one tax computation path in the whole system, not three.
- **GST is always computed into the invoice's `grandTotal` before any payment gateway
  is ever contacted** — `createGatewayOrder` charges `invoice.balanceDue()`, which is
  `grandTotal - amountPaid`, and `grandTotal` already includes `taxTotal` from the
  moment the invoice was created. There's no path where a gateway charge could exclude
  GST.
- **Payment gateway abstraction, built to add any provider without touching
  `BillingService`**: `PaymentGatewayService` is the interface
  (`createOrder(amount, currency, receipt)`, `verifyPayment(orderId, paymentId, signature)`);
  Spring auto-collects every implementing bean into a `Map<String, PaymentGatewayService>`
  keyed by each gateway's own `gatewayName()`. **Adding Stripe, PayU, or anything else
  later is: implement the interface, register the bean, done** — no registry
  boilerplate, no changes to `BillingService`, `BillingController`, or any billed
  module.
- **`RazorpayGatewayService`** — the first (and default) implementation. Uses the plain
  JDK `HttpClient` directly against Razorpay's REST API (no extra SDK dependency),
  creates an order via `POST /v1/orders`, and verifies the checkout callback with the
  documented HMAC-SHA256 signature scheme (`order_id|payment_id` signed with the key
  secret, constant-time compared). Configured via `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
  / `RAZORPAY_ENABLED` environment variables — disabled by default, returning a clear
  503 rather than silently pretending to work until real keys are set.
- `POST /api/billing/invoices/{id}/gateway/order` (step 1: open a gateway order for the
  invoice's exact outstanding balance) and `POST /api/billing/invoices/{id}/gateway/confirm`
  (step 2: verify the checkout callback, then record the payment for real) — both go
  through the same `recordPayment` bookkeeping every other payment does.

### Known simplifications in this pass
- Refunds are modeled (`Payment.refund` flag) but no endpoint issues one yet — Pharmacy
  returns still adjust stock directly rather than routing a refund through Billing; that
  wiring is the natural next step.
- No invoice cancellation endpoint yet, though `InvoiceStatus.CANCELLED` exists in the
  schema.
- Tax/discount math is intentionally duplicated between Pharmacy's own line-item
  calculation (needed for batch-level stock accounting) and the mirrored invoice lines
  Billing receives — they're built from the same numbers in the same request, so they
  can't drift, but it's not a single shared calculation function.
- No webhook endpoint yet — payment confirmation relies on the frontend calling
  `/gateway/confirm` after Razorpay's checkout succeeds. This works for the normal flow,
  but if the browser is closed before that call fires, the payment succeeds on
  Razorpay's side without being recorded here. A webhook listener
  (`POST /api/billing/webhooks/razorpay`) verifying Razorpay's webhook signature would
  close that gap and is the natural next step for production reliability.
- Seed data (`DataSeeder`) matching the frontend's demo data 1:1 — same 5 org types,
  4 plans, and all 19 system roles from `rbac.ts`, plus one demo organization
  ("Sunrise Multispeciality") with a platform, tenant-owner and patient account.

## What's implemented — Organization Foundation (org lifecycle, branches, invitations)

- **Real organization identity**: `organizationCode` (ORG-000001, generated off a
  Postgres sequence — atomic under concurrent creation, never reused even if an org is
  later deleted) and a unique `slug`, both backend-generated and immutable, matching
  spec §10-11. A full profile (address, GST number, registration number, website, logo,
  timezone, currency, language) replaces the handful of fields that existed before.
- **The full 8-state lifecycle** (`DRAFT → PENDING_VERIFICATION → TRIAL → ACTIVE →
  GRACE_PERIOD → SUSPENDED → CANCELLED → ARCHIVED`, spec §12), not the old 4-state
  stand-in. The exact login rule table from spec §13 is enforced in
  `AppUserPrincipal.isEnabled()`: DRAFT/PENDING_VERIFICATION/ARCHIVED block login
  entirely; SUSPENDED/CANCELLED only let the Org Owner in (to resolve billing); everyone
  else is locked out. `AccessService.requireModuleEnabled` separately blocks every
  business module (Clinic/Pharmacy/Lab/CRM/CMS) org-wide while SUSPENDED/CANCELLED, even
  for the owner — only ORG/BILLING stay reachable, which is exactly enough to fix it.
- **`OrganizationSettings`** — one row per org: date/time format, appointment slot and
  buffer minutes, overbooking policy, business hours, notification toggles. Self-service
  editable at `GET`/`PUT /api/org/settings`.
- **Branch lifecycle + real limit enforcement** (`Branch.status`:
  DRAFT/ACTIVE/INACTIVE/SUSPENDED/CLOSED, spec §21, plus per-branch `enabledModules`):
  `POST /api/org/branches` checks the current active-branch count against
  `Plan.maxBranches` and rejects with the spec's exact message ("Your subscription
  branch limit has been reached.") when it's full. The head office branch can't be
  closed. `PATCH /api/org/branches/{id}/status` moves a branch through its lifecycle —
  closed branches are never deleted, preserving historical data (spec §21 rule).
- **A genuine invitation flow** (`UserInvitationService`), replacing the old "hand them
  a temp password directly" model everywhere except Doctor creation (which stays on its
  own direct-password flow by design — see below): a new user (including the Org Owner,
  created the moment an organization is provisioned) is created `INVITED` with a
  single-use token and **no usable password** — `AppUserPrincipal.isEnabled()` already
  refused non-ACTIVE accounts, so an invited user simply cannot sign in until they visit
  `GET /api/public/invitations/{token}` (preview) and `POST .../accept` (set their own
  password, token expires after 7 days). `POST /api/org/users/{id}/resend-invitation`
  reissues a fresh token. Real email delivery isn't wired up — the invite link is logged
  in its place, same pattern as everywhere else in this build that would need outbound
  email.
- **Real user-limit enforcement**: `POST /api/org/users` counts ACTIVE + INVITED users
  against `Plan.maxUsers` before creating a new one, with the spec's exact message
  ("Your subscription user limit has been reached.").
- **Branch assignment** (`ALL_BRANCHES` vs `SELECTED_BRANCHES`, spec §32) added to every
  user — an Org Owner typically gets every branch (now and any added later); a
  Receptionist can be scoped to just the branches they work at.
- **Full provisioning flow** (`OrganizationService.create`, spec §7, "Organization
  Provisioning Service — do not create separate logic for each customer source"): one
  method creates the org record with a generated code/slug, a settings row, a head
  branch with the org's currently-enabled modules pre-applied, and invites the Org
  Owner — every organization-creation path (self-serve signup, sales-assisted, demo
  conversion) is meant to call this same method, tagged with the appropriate
  `creationSource` for reporting only (spec §6 — it never changes behavior).

### Known simplifications and gaps in this pass
- Doctor creation (`ClinicDoctorService`) intentionally still uses the older
  direct-temp-password model rather than the invitation flow — Clinic staff onboarding
  already worked well with it, and rewiring it wasn't essential to delivering the
  Organization Foundation itself. It's the natural next candidate for consistency.
- Doctor accounts aren't counted against the plan's user limit yet — only accounts
  created through `POST /api/org/users` are.
- No real email delivery anywhere in this build (invitations, welcome emails) — every
  place that would send one logs the content/link instead, consistent with the rest of
  this project.
- `DEPARTMENT` records are org-scoped but not yet branch-scoped in the schema (spec §23
  ties every department to one branch) — Department was built earlier for the Master
  Data Engine before Branch had a proper status/lifecycle; linking it to a specific
  branch is a small follow-up, not a redesign.
- Organization Type configuration (spec §5 — Super Admin editing which modules an org
  type allows) isn't exposed through a platform UI yet; `OrgType` rows exist and are
  fully functional, just seeded rather than editable in this pass.

## What's implemented — Website Builder (template-based public site)

- **Org self-service content management** (`WebsiteContentService`, spec: "Organization
  Owners can manage Logo, Brand Colors, Organization Information, Home Page, About Page,
  Services, Gallery, Testimonials, Blogs, Contact Information, Social Links, SEO
  Settings"): `WebsiteConfig` is the one-row-per-org branding/pages/contact/social/SEO
  record; `WebsiteServiceItem`, `WebsiteGalleryImage`, `WebsiteTestimonial`,
  `WebsiteBlogPost` are the repeatable content lists, each with full CRUD under
  `/api/org/website/*`.
- **Doctors and Departments are never duplicated onto the website** — the public site
  reads them live from the same Clinic data the Doctors/Departments screens already
  manage (`Doctor.visibleOnWebsite` lets a doctor opt out of the public listing without
  touching their actual staff record), so there's exactly one place that data lives.
- **The public site itself** (`PublicWebsiteService` + `PublicWebsiteController`,
  unauthenticated by design): `GET /api/public/site/{slug}` returns everything the
  template needs in one call — org info, branding, services, doctors, departments,
  gallery, testimonials, and published blog posts — refusing to serve anything for an
  org that hasn't hit "Publish" yet. `GET /api/public/site/{slug}/blog/{blogSlug}` for
  individual posts.
- **A real contact form** (`POST /api/public/site/{slug}/contact`) that lands in
  `WebsiteContactSubmission`, visible to the org at `/api/org/website/contact-submissions`
  with a mark-as-read action — this is the "Contact Forms" requirement, and also the
  natural seam for a future CRM module to plug into instead of a bespoke inbox.
  **Online Appointment Booking**, unauthenticated (`POST /api/public/site/{slug}/book-appointment`):
  reuses `ClinicPatientService.findOrCreateByPhone` (matches an existing patient by phone,
  or creates one) and the same `ClinicAppointmentService.book` the staff-side booking
  flow uses — a public visitor and a receptionist end up going through identical
  business logic, just from different entry points. Refuses if the org hasn't enabled
  booking or doesn't run Clinic at all.
- Every write endpoint requires `ROLE_ORG_OWNER`/`ROLE_ORG_ADMIN`/`ROLE_MARKETING_MANAGER`
  and `AccessService.requireModuleEnabled(org, CMS)` — an org whose plan or business type
  doesn't include Website Builder can't touch any of this, same pattern as every other
  module.
- **`PublicWebsiteController` was added in this pass** — `PublicWebsiteService` already
  existed fully implemented, but nothing exposed it over HTTP, so none of the public
  site, blog, contact form, or booking endpoints were actually reachable before now.

### Known simplifications and gaps in this pass
- No real subdomain routing (`<slug>.mediunivers.com`) — that's infrastructure-level DNS/
  reverse-proxy configuration outside what an application-layer change can provide. The
  API and the demo frontend both use the slug as a path segment instead
  (`/site/{slug}`); wiring real subdomains later doesn't change any of this API.
- No image upload — gallery/logo/blog cover images are URLs the Org Owner pastes in,
  not a file upload pipeline.
- Only one template (`WebsiteConfig.templateCode` exists specifically so more can be
  added later without a schema change, but only one is implemented).
- The public booking form doesn't check doctor availability/slot capacity — it creates a
  `BOOKED` appointment the same way staff-side scheduled booking does, which doesn't
  itself validate against `DoctorAvailability` yet (a pre-existing gap in Clinic, not
  something Website Builder introduces).
- Contact submissions are a standalone inbox, not yet routed into a CRM pipeline — CRM
  itself isn't built yet.

## What's implemented — Subscription Engine (plans, pricing, subscription history)

- **Real numeric pricing on `Plan`**: `priceWithoutTax` + `taxPercent` (single GST-style
  rate), plus `maxDoctorsPerBranch`, `isFreeTrial`/`freeTrialDays`, and an `active`
  soft-delete flag. `priceWithTax` is never stored — it's computed on the fly by
  `PricingCalculator.withTax(...)` at DTO-mapping time, so a later tax-rate edit can never
  leave a stale computed value sitting in the database.
- **New `Subscription` entity** — one row per organization per subscription period: start/
  end date, a full price snapshot independent of whatever the `Plan` catalog row looks
  like later (`planCodeSnapshot`/`planNameSnapshot`), free-trial flag/days, gateway fields
  (`paymentGateway`/`gatewayOrderId`/`gatewayPaymentId`), and a status lifecycle
  (`PENDING_PAYMENT → ACTIVE → EXPIRED/CANCELLED/SUPERSEDED`). `Organization.plan` +
  `renewsOn` stay a denormalized pointer to whichever `Subscription` is currently
  `ACTIVE`, kept in sync everywhere a subscription changes — every existing read path
  (`org.getPlan().getMaxBranches()`, JWT claims, `GET /api/me`) needed zero changes.
- **`GET /api/platform/plans` (admin) / `GET /api/public/plans` (public, active-only)**,
  with `POST`/`PUT`/`DELETE /api/platform/plans` restricted to **`ROLE_SUPER_ADMIN` only**
  — deliberately narrower than most platform resources, per the explicit requirement that
  plan CRUD is super-admin-only, not opened up to Finance or Sales Lead even though they
  can view. Deleting a plan is a soft delete (`active=false`), blocked with `409` while any
  organization has an `ACTIVE` subscription on it, since plans are FK'd from
  `Organization`/`Subscription` history and are never physically removed.
- **`GET /api/platform/subscriptions` and `/subscriptions/trials`** — read-only visibility
  for platform staff; subscriptions change only via the signup/payment/cron flows below,
  never manual admin edits.
- **Fixed a real bug**: `OrganizationService.create()` used to hardcode every new
  organization to `TRIAL` status regardless of which plan was chosen. It now creates the
  matching `Subscription` and sets status correctly — `TRIAL` only if the plan is actually a
  free trial, `ACTIVE` immediately otherwise (this endpoint is platform-staff-only, so a
  human has already closed the deal — no payment gate needed here).
- **Doctor seats are capped per branch by the plan**, not just per-org user seats:
  `ClinicDoctorService.create()` now checks `DoctorRepository.countByBranchId(...)` against
  `Plan.maxDoctorsPerBranch` alongside the pre-existing org-wide seat check.

### Known simplifications in this pass
- Admin plan mutation doesn't emit an audit-log entry yet (no audit-log system exists in
  this build at all — see "What's NOT implemented").
- `changePlan` (the platform-staff "swap an org's plan directly" endpoint) supersedes the
  prior `Subscription` and creates a new one, but doesn't itself charge anything — it's for
  staff-mediated plan changes (e.g. a manually-negotiated upgrade), not a customer-facing
  payment flow.

## What's implemented — Public Self-Serve Signup (account creation, plan purchase, free trial)

Two genuinely separate public flows, both unauthenticated, both under
`/api/public/organizations/*`:

- **`POST /api/public/organizations/free-trial`** — the full org + owner details in one
  call, immediately provisioned as `TRIAL` status on the seeded free-trial plan. No payment
  step exists for this path at all.
- **`POST /api/public/organizations/create-account`** — org + owner details **with no plan
  chosen yet**. The organization is created `DRAFT` and assigned a reserved,
  non-public **`UNSUBSCRIBED` placeholder plan** (seeded via `V18`, zero modules, zero
  branch/doctor limits, `active=false` so it never appears in `GET /api/public/plans` or
  the Super Admin's plan list, and protected from admin edit/deactivate). This was a
  deliberate design choice over making `organizations.plan_id` nullable: the placeholder
  keeps every existing `org.getPlan()` call site working unchanged while still guaranteeing
  **zero real product access** until a plan is actually paid for — verified live: a
  logged-in owner of a `DRAFT`/unsubscribed org gets a clean `403` ("CLINIC is not included
  in the current subscription plan") from every business-module endpoint, purely because
  `AccessService.requireModuleEnabled` already checks `plan.getModules()`, which is empty
  for this placeholder. No new access-control code was needed for this to be safe.
- **`POST /api/public/organizations/{id}/select-plan`** (header `X-Signup-Token`) — step 2:
  pick a real plan, get back a Razorpay order via the existing `PaymentGatewayService`
  abstraction (same interface Billing already used — no new payment code, just a new
  caller). Cancels any earlier unpaid attempt for the org first so retries don't leave
  orphaned `PENDING_PAYMENT` rows.
- **`POST /api/public/organizations/{id}/subscribe/confirm`** (header `X-Signup-Token`) —
  step 3: verify the gateway callback, then the `Subscription` goes `ACTIVE` **and the
  organization's real plan is assigned for the first time** (`org.setPlan(sub.getPlan())`)
  — the placeholder never leaks past this point.
- **The org owner is invited (not handed a password) the moment the account is created**,
  before any plan is chosen or paid for — this is safe because a `DRAFT` org already blocks
  every business-module endpoint via the empty-modules placeholder plan above, and because
  of the login rule described next.
- **`AppUserPrincipal.isEnabled()` now lets a `DRAFT` org's Owner log in** (previously
  `DRAFT` blocked everyone outright). This was a deliberate, explicitly-requested change:
  rather than blocking login entirely while unsubscribed, the owner can sign in immediately
  and is routed straight to a plan-purchase screen — matching how `SUSPENDED`/`CANCELLED`
  already only let the Owner through. Everyone else on a `DRAFT` org still can't log in at
  all.
- **`X-Signup-Token`** proves ownership of a `DRAFT` org across this whole multi-step,
  session-less flow — a random token stamped on `Organization.signupToken` at
  `create-account` time, checked on every subsequent call, cleared the moment the org
  leaves `DRAFT`.

### Known simplifications in this pass
- No webhook for Razorpay — same gap already noted under Billing; if the browser closes
  before `/subscribe/confirm` fires, a successful gateway payment wouldn't be recorded here.
- An org that creates an account but never returns to pick a plan stays `DRAFT` forever
  (an "abandoned cart") — there's no cleanup job for this yet, though the Owner can always
  return, log in, and complete it via `/app/org/plans` on the frontend.
- Subdomain/email uniqueness checks (`requireSubdomainAvailable`/`requireEmailAvailable`)
  are simple existence checks, not reserved-word or profanity filtering.

## What's implemented — Forgot / Reset Password

The frontend's `forgot-password`/`reset-password` pages were already calling
`POST /api/public/auth/forgot-password` and `/reset-password` — **neither endpoint existed
on the backend until this pass**; every login attempt from those pages was a 404. Now:

- **`AuthPasswordResetService`** — a separate mechanism from `UserInvitationService`'s
  invite-token flow on purpose: `AppUser.resetToken`/`resetTokenExpiresAt` (new columns,
  `V14`) are distinct from `inviteToken`/`inviteExpiresAt`, since `UserInvitationService.accept()`
  guards on `status == INVITED` — reusing the invite token for a password reset (which only
  makes sense for an already-`ACTIVE` account) would collide with that guard.
- **`requestReset(email)` always returns success**, whether or not the email matches an
  account — standard practice to avoid leaking which emails have accounts. A 15-minute
  token is emailed through the existing Communication Engine (`NotificationEventType.PASSWORD_RESET_REQUESTED`,
  new default template seeded for every org via `V14`, since `NotificationTemplateService.seedDefaults()`
  is a no-op for orgs that already have templates).
- Platform staff (no organization) get the same log-only fallback `UserInvitationService`
  already used for invites — there's no per-org template catalog to render from without an
  organization.

## What's implemented — Free-Trial Auto-Expiry (cron job)

- **`TrialExpiryService.expireOverdueTrials()`** — `@Scheduled(cron = "${mediunivers.trial-expiry-cron}")`,
  same plain-Spring `@Scheduled` idiom as the existing `NotificationSchedulerService` (the
  only scheduling precedent in this codebase — no Quartz introduced for one job). Finds
  every `ACTIVE` free-trial `Subscription` past its `endDate`, flips it to `EXPIRED` and the
  organization to `SUSPENDED`.
- **`SUSPENDED` was chosen deliberately, not a new status** — `AppUserPrincipal.isEnabled()`
  already restricts `SUSPENDED` orgs to Owner-only login, which is exactly "let them back in
  only to re-subscribe." Zero security-layer changes were needed.
- Configurable via `mediunivers.trial-expiry-cron` (`TRIAL_EXPIRY_CRON` env var), standard
  cron syntax, default hourly on the hour.
- Verified live: seeded a `Subscription` with a backdated `endDate`, ran with a 20-second
  cron interval, confirmed the job fired on schedule and flipped both rows correctly.
- A `TRIAL_EXPIRED` notification (email) fires to the org's owner when this happens, same
  Communication Engine pattern as everything else, seeded for existing orgs via `V15`.

## What's implemented — Lead / Demo-Request Pipeline (CRM foundation)

- **`Lead` gained a real pipeline**: `LeadStatus` (`NEW_LEAD → CONTACTED → DEMO_SCHEDULED
  → DEMO_COMPLETED → WON/LOST`), assignment to a platform staff member
  (`assignedTo`/`GET /api/platform/staff` for the picker), internal notes, and the extra
  fields the Request Demo form actually collects (`expectedUsers`, `modulesOfInterest`,
  `preferredDemoDate`).
- **`GET /api/platform/leads`** plus `PATCH .../status`, `PATCH .../assign`,
  `POST .../notes`, gated to the roles already seeded with `platform/leads`/
  `platform/demo-requests` page access (`SUPER_ADMIN`, `PLATFORM_SALES_LEAD`,
  `PLATFORM_SALES_AGENT`) — this is the "standard CRM process" a Request Demo submission
  now genuinely flows into, not a bigger CRM system (see "What's NOT implemented").
- `PublicLeadController`'s existing `POST /api/public/leads` (already implemented before
  this pass) is what every public form — Contact, Request Demo, Free Trial, Pricing — feeds
  into; this pass is what gives platform sales staff a real, working screen to act on it.

## What's implemented — Website Template Catalog (platform + organization templates)

- **New `WebsiteTemplate` catalog** (`TemplateAudience.PLATFORM`/`ORGANIZATION`) —
  platform-managed identity + default branding rows, config-driven per the confirmed
  design (curated templates + a structured settings form, not a freeform page builder).
  `GET /api/public/website-templates?audience=` is public (needed pre-login too, e.g. during
  signup); `POST`/`PUT`/`DELETE /api/platform/website-templates` are `ROLE_SUPER_ADMIN`-only.
- **`WebsiteConfig` extended** with `templateId` (references the new catalog, `templateCode`
  kept for backward compatibility), plus generic slot columns for `fontFamily`,
  `backgroundColor`, `textSizeScale`, and JSON-as-text `bannersJson`/`navItemsJson`/
  `footerColumnsJson` — same precedent as the pre-existing `OrganizationSettings.businessHoursJson`.
- **New singleton `PlatformWebsiteConfig`** (`platform_website_config`, one row by
  convention) — the real backend for MediUnivers' own site content, previously entirely
  mock on the frontend. `GET`/`PUT /api/platform/website-config`, gated to `SUPER_ADMIN`/
  `PLATFORM_MARKETING` (matching the role DataSeeder already seeds with `platform/cms`
  access).
- **Appointment booking is now mandatory, not optional**: `PublicWebsiteService.bookAppointment()`
  no longer gates on `WebsiteConfig.bookingEnabled` — every published organization site
  gets a working booking section, per the explicit requirement. The field stays in the
  schema/DTO for backward compatibility; the UI toggle was removed.

### Known simplifications in this pass
- Config-driven only, as decided — banners/nav/footer are structured JSON fields edited as
  JSON in the branding UI, not a visual drag-and-drop block editor.
- The platform's own static marketing pages (`index.tsx`, `about.tsx`, etc.) don't render
  from `PlatformWebsiteConfig` yet — this pass ships the catalog + admin editing backend;
  wiring the existing marketing routes to read from it is a separate follow-up.

## What's NOT implemented yet

- **Full CRM** — the lead pipeline above is real (capture, assign, status, notes), but
  broader CRM (follow-up scheduling, campaigns, activity timelines) isn't built.
- **Coupons, referrals, support tickets, audit logs, platform user/role admin CRUD** — all
  still frontend-mock only, no backend at all. Each is a real system to design from scratch
  when needed, not a small wiring change like `platform/organizations` was.
- Clinic, Pharmacy, Laboratory, Billing, Website Builder (+ its new template catalog),
  Organization Foundation, and the Subscription Engine / self-serve signup covered above
  are all real, backend-backed features.

## Running it locally

1. Start PostgreSQL and create a database:
   ```sql
   CREATE DATABASE mediunivers;
   CREATE USER mediunivers WITH PASSWORD 'mediunivers';
   GRANT ALL PRIVILEGES ON DATABASE mediunivers TO mediunivers;
   ```
   (or override `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` env vars)

2. Run the service:
   ```bash
   ./mvnw spring-boot:run
   ```
   Flyway runs the migration and `DataSeeder` populates reference + demo data on
   first boot. Watch the startup log for the demo account list.

3. Set `MEDIUNIVERS_FRONTEND_URL` if the SPA isn't at the default
   `http://localhost:3000` (this drives both CORS and the registered OAuth2
   redirect URI, `<frontend-url>/oauth/callback`).

4. Optional — to enable real online payments, get test API keys from the Razorpay
   dashboard (Settings → API Keys) and set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   and `RAZORPAY_ENABLED=true`. Without these, invoices **and** the paid self-serve
   signup / re-subscribe flows still work end to end up to the payment step —
   "Pay online" / "Subscribe" just returns a clear 503 instead of opening a checkout.

5. Optional — override how often the free-trial expiry job runs with
   `TRIAL_EXPIRY_CRON` (standard cron syntax, defaults to hourly:
   `0 0 * * * *`). Useful to shorten for local testing, e.g. `*/30 * * * * *`
   (every 30 seconds) to watch a seeded expired trial actually flip.

## Demo accounts (password `demo1234` for all)

| Portal   | Email                          | Role      |
|----------|---------------------------------|-----------|
| Platform | superadmin@mediunivers.io      | Super Admin |
| Tenant   | owner@sunrise.mediunivers.io   | Organization Owner (Sunrise Multispeciality) |
| Patient  | patient@sunrise.mediunivers.io | Patient |

## How sign-in actually works

1. The SPA generates a PKCE code verifier/challenge and redirects the full
   browser to `GET /oauth2/authorize?...` on this backend.
2. This service shows its login page (Spring Security's built-in form for now —
   swap in a branded template later without touching any OAuth2 wiring) and
   authenticates the email/password against `app_users` (BCrypt).
3. On success, the browser is redirected back to the SPA's `/oauth/callback`
   with a one-time authorization code.
4. The SPA exchanges that code (+ its PKCE verifier) for a JWT access token at
   `POST /oauth2/token` — no client secret involved anywhere.
5. The SPA calls `GET /api/me` with `Authorization: Bearer <token>` to hydrate
   the console with the real role/organization/plan/branch.

## Known limitations to harden before a real production deploy

- The RSA signing key (`JwkConfig`) is generated fresh on every restart and
  kept in memory only — this invalidates all sessions on restart and won't
  work across more than one running instance. Replace with a key loaded from
  a persisted secret store.
- `RegisteredClientRepository`, `OAuth2AuthorizationService` and
  `OAuth2AuthorizationConsentService` are all in-memory — fine for a single
  instance, but should move to their JDBC-backed equivalents for horizontal
  scaling.
- The `/login` page is Spring Security's auto-generated default form —
  functional, unbranded. Swapping in a themed template doesn't require
  touching the OAuth2 configuration at all.
- No refresh-token rotation handling on the frontend yet (access tokens are
  short-lived — 30 minutes — and there's no silent-refresh flow wired up, so a
  session currently just expires and sends the person back to `/login`).
- **`RAZORPAY_ENABLED=false` by default** means the entire paid self-serve signup
  path (`/subscribe/plans` → select-plan → confirm), and the authenticated re-subscribe
  screen (`/app/org/plans`), can be exercised up to the payment step and no further without
  real Razorpay test/live keys — the gateway call returns a clear `503` rather than
  silently succeeding, which is correct behavior, but means this whole path needs real
  credentials to demo end to end.
- Real email delivery still isn't wired up anywhere — invitations, password resets, and
  every Communication Engine notification log their content/link instead of sending it,
  same as noted under Organization Foundation above. This affects every new flow in this
  pass too (signup welcome emails, password reset links, trial-expiry notices).
 ===========================================================================================================
- CODE_VERIFIER  = rS5_GVDiBfoSZD5LpXeh9Wtt4yGDKogiUJAY42nkjGSiXRTIk4wLLEIuWd7RJm9w
  CODE_CHALLENGE = 2nxqHmOWkmXxRADUFiseyb7CXA8ScZkJdj7jeCe3mG0
  STATE          = YwPzE5lPSWrZRyxQ

1. Open this in a browser (paste the full URL — it's one line):

http://localhost:8080/oauth2/authorize?response_type=code&client_id=mediunivers-web&redirect_uri=http://localhost:3000/oauth/callback&scope=openid%20profile&state=YwPzE5lPSWrZRyxQ&code_challenge=2nxqHmOWkmXxRADUFiseyb7CXA8ScZkJdj7jeCe3mG0&code_challenge_method=S256

Log in with a demo account (owner@sunrise.mediunivers.io / demo1234). You'll land on:

http://localhost:3000/oauth/callback?code=AUTH_CODE_HERE&state=YwPzE5lPSWrZRyxQ

Copy the code value from that URL.
=========================================================================
for react with custom login page============
@RestController
@RequestMapping("/api/public/auth")
@RequiredArgsConstructor
public class LoginController {

    private final AuthenticationManager authenticationManager;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req, HttpServletRequest httpReq) {
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(req.email(), req.password())
        );

        // This is the key step: put the authenticated user into the SAME
        // session the browser will carry into /oauth2/authorize next.
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        httpReq.getSession(true)
               .setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

        return ResponseEntity.ok().build(); // sets JSESSIONID cookie via Set-Cookie
    }
}
-------------
async function login(email, password) {
const res = await fetch('http://localhost:8080/api/public/auth/login', {
method: 'POST',
credentials: 'include', // important — keeps the session cookie
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ email, password }),
});

if (!res.ok) {
// show your own error message — no redirect, no page reload
return false;
}

// now silently kick off the real OAuth2 flow — browser nav, not fetch
const { verifier, challenge } = generatePkcePair();
sessionStorage.setItem('pkce_verifier', verifier);
window.location.href =
`http://localhost:8080/oauth2/authorize?response_type=code&client_id=mediunivers-web` +
`&redirect_uri=http://localhost:3000/oauth/callback&scope=openid profile` +
`&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
}
---------------------------------------------


A session and an OAuth2 authorization request are two completely unrelated concepts that happen to both be checked against the same HttpSession object on the server. The login endpoint's only job is: "prove who this person is, and record that fact in a session." The /oauth2/authorize endpoint's only job is: "check if this session already has a proven identity — if yes, proceed; if no, go get one." Neither endpoint needs to know anything about the other's parameters.

Walking through it with real values

Step 1 — Browser has no cookies yet. React calls the login endpoint:

http
POST /api/public/auth/login HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{"email":"owner@sunrise.mediunivers.io","password":"demo1234"}

Only email and password — correct, nothing else needed here, because this endpoint's whole purpose is narrow: authenticate the credentials.

Server side, inside LoginController:

java
Authentication auth = authenticationManager.authenticate(
new UsernamePasswordAuthenticationToken(req.email(), req.password())
);
// auth now succeeded — Spring knows this is a real, valid user

httpReq.getSession(true); // ← THIS is the important line

getSession(true) creates a brand new HttpSession on the server if one doesn't exist — Spring Boot's embedded Tomcat generates a random session ID for it, something like:

JSESSIONID = 8F3A9C1D5B7E2F04A1C9D3E7B5A80421

Then SecurityContextHolder's context (which now contains "this session belongs to owner@sunrise.mediunivers.io, authenticated") gets attached to that session object, server-side, in memory (or wherever your session store is).

Server responds:

http
HTTP/1.1 200 OK
Set-Cookie: JSESSIONID=8F3A9C1D5B7E2F04A1C9D3E7B5A80421; Path=/; HttpOnly

That Set-Cookie header is the entire hand-off mechanism. The browser now stores this cookie and — because Path=/ and same origin (localhost:8080) — will automatically attach it to every subsequent request to that same origin, no matter what that request is for.

Step 2 — React does the browser navigation (not fetch) to authorize:

js
window.location.href =
`http://localhost:8080/oauth2/authorize?response_type=code&client_id=mediunivers-web` +
`&redirect_uri=http://localhost:3000/oauth/callback&scope=openid profile` +
`&state=xyz&code_challenge=abc&code_challenge_method=S256`;

The actual browser request that fires looks like this — note the cookie is there automatically, the browser adds it, your JS code never touches it:

http
GET /oauth2/authorize?response_type=code&client_id=mediunivers-web&redirect_uri=http://localhost:3000/oauth/callback&scope=openid+profile&state=xyz&code_challenge=abc&code_challenge_method=S256 HTTP/1.1
Host: localhost:8080
Cookie: JSESSIONID=8F3A9C1D5B7E2F04A1C9D3E7B5A80421

Server side: Spring Security's session filter sees Cookie: JSESSIONID=8F3A9C..., looks up that session ID in its session store, finds the SecurityContext that was attached to it in Step 1, and reconstructs: "this request belongs to an authenticated user, owner@sunrise.mediunivers.io." The .authorizeHttpRequests().anyRequest().authenticated() check on this chain passes immediately — no redirect to /login, because the session already answers "yes, authenticated" before that check even needs to ask.

From here, AuthorizationServerConfig's normal logic takes over — validates client_id/redirect_uri against RegisteredClientRepository, stores the code_challenge against a newly generated authorization code, and issues:

http
HTTP/1.1 302 Found
Location: http://localhost:3000/oauth/callback?code=SOME_AUTH_CODE&state=xyz
The mapping, spelled out
What lives where	Value	Set by
Session ID	8F3A9C1D...	Login endpoint (Step 1), via getSession(true)
"Who does this session belong to"	owner@sunrise...	Login endpoint, via SecurityContextHolder
client_id, code_challenge, redirect_uri, state	mediunivers-web, abc, etc.	The /oauth2/authorize URL itself (Step 2) — not stored in the session at all

Those two rows never touch each other. The session only ever carries identity (who is this person). The OAuth2 parameters travel entirely within the /oauth2/authorize request's own query string and are handled entirely by AuthorizationServerConfig's own logic, independent of how the session came to be authenticated. Whether that session got authenticated via Spring's default /login form, your custom /api/public/auth/login endpoint, or any other mechanism — /oauth2/authorize doesn't care and can't tell the difference. It only ever asks one question of the session: authenticated, yes or no.


=============
2. Exchange the code for a token:

bash
curl -X POST http://localhost:8080/oauth2/token ^
-d "grant_type=authorization_code" ^
-d "code=AUTH_CODE_HERE" ^
-d "redirect_uri=http://localhost:3000/oauth/callback" ^
-d "client_id=mediunivers-web" ^
-d "code_verifier=rS5_GVDiBfoSZD5LpXeh9Wtt4yGDKogiUJAY42nkjGSiXRTIk4wLLEIuWd7RJm9w"

(^ is the Windows cmd.exe line-continuation character — if you're in PowerShell, replace each ^ with a backtick `, or just put it all on one line.)

3. Call the resource server:

bash
curl http://localhost:8080/api/me -H "Authorization: Bearer ACCESS_TOKEN_HERE"