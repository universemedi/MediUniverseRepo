# MediUnivers — Frontend Console

Healthcare SaaS frontend built with React 19, TypeScript, TanStack Start, TanStack Router, Redux Toolkit,
Tailwind CSS and shadcn/ui. This build talks to a real backend (see `/service`) for authentication —
sign-in is genuine OAuth2 (Authorization Code + PKCE), not a client-side mock. Clinic, Pharmacy,
Laboratory, Billing, Website Builder, the Subscription Engine, self-serve signup, and the lead/
demo-request pipeline are all wired to the real backend. What's still mocked in the browser
(`src/lib/mock.ts`, `src/lib/rows.ts`, the generic `app.$.tsx` catch-all): `platform/coupons`, `platform/referrals`,
`platform/support`, `platform/audit-logs`, platform user/role admin, and full CRM (follow-ups,
campaigns) — none of these have a backend yet. See the backend README for exactly what's implemented.

## Running it

> **Important:** this zip does **not** include `node_modules`. Installing on your own machine avoids the
> native-binary mismatch that breaks the app when `node_modules` is copied from a different OS/CPU.

1. Copy `.env.example` to `.env` and point `VITE_API_BASE_URL` at your running backend
   (defaults to `http://localhost:8080`).
2. ```bash
   npm install
   npm run dev       # http://localhost:3000
   ```
3. ```bash
   npm run build      # production build -> .output/
   npm run preview    # serve the production build locally
   ```

Requires Node.js 20+, and the backend running with a reachable PostgreSQL (see `/service/README.md`).

## Signing in (real OAuth2 now)

`/login` no longer has role/plan/portal pickers that fake a session — it starts a real
Authorization Code + PKCE flow:

1. The SPA generates a PKCE verifier/challenge and redirects the browser to the backend's
   `/oauth2/authorize`.
2. You authenticate on the backend's login page (email + password, checked against PostgreSQL).
3. The browser is redirected back to `/oauth/callback`, which exchanges the code for a JWT
   (no client secret — this is a public SPA client, PKCE is what proves it's the same app).
4. The SPA calls `GET /api/me` to hydrate Redux with your **real** role, organization, subscription
   plan, org type and branch — these are no longer chosen in the UI, they come from your account.

Demo accounts (password `demo1234` for all — shown on the login screen too):

| Portal   | Email                            |
|----------|-----------------------------------|
| Platform | superadmin@mediunivers.io        |
| Tenant   | owner@sunrise.mediunivers.io     |
| Patient  | patient@sunrise.mediunivers.io   |

Sign out from the avatar menu top-right — this clears the stored token and sends you back to `/login`.

## Role-based access model

Three independent layers combine to decide what a signed-in user sees, and as of this pass all three are
**backend-issued**, not frontend-picked:

1. **Organization Type** (`src/lib/orgTypes.ts` client-side / `org_types` table backend) — what business
   the org actually runs. A clinic-only organization never sees Pharmacy or Laboratory anywhere — not even
   as a locked "upgrade" item — because those aren't businesses it runs.
2. **Subscription Plan** — of the modules the org type includes, which are currently paid for. Locked-but-
   applicable modules show as an "Upgrade" tile pointing at Subscription & Billing.
3. **Role** — within modules that are both applicable and unlocked, which exact pages and actions this
   role can use. The backend re-checks all of this on every request (`AccessService` mirrors the
   frontend's `usePermissions()` logic) — the frontend hiding a button is a UX nicety, not the real
   security boundary.

### Previewing other identities (demo only, clearly labeled)

The **"Preview" button** in the topbar still lets you locally swap which role/plan/branch the *UI* shows,
without signing out — useful for demoing access differences quickly. It's explicitly labeled as a UI-only
preview now: if you preview a role different from the one your account actually authenticated as, a small
amber dot appears on the button and a warning explains that API calls still use your real account's
permissions and will be rejected if they don't match. This is intentional — the backend is the real
authority, not this switcher.

## What changed in this pass

- **Subscription Engine + self-serve signup, wired end to end**:
  - `/pricing` and the homepage's plan section now fetch live `GET /api/public/plans`
    instead of the old hardcoded `lib/plans.ts` array — real numeric pricing, tax, and
    per-plan limits.
  - **Account creation and plan purchase are now two separate pages**, not one combined
    step: `/subscribe` collects only organization + owner details and creates the
    account (no plan chosen yet); `/subscribe/plans` is a new page showing full plan
    detail cards (price with/without tax, every highlight, unlocked modules, branch/
    user/doctor limits) where the customer actually picks a plan and pays via Razorpay.
    The signup session (organization id + a short-lived signup token) carries between
    the two pages via `sessionStorage` (`src/lib/signupSession.ts`), not the URL.
  - `/free-trial` now submits to the real `POST /api/public/organizations/free-trial`
    endpoint and shows the live trial plan's details instead of a static mock card.
  - `/request-demo` now submits to the real `POST /api/public/leads` endpoint.
  - `forgot-password` / `reset-password` — these pages already existed and called
    `/api/public/auth/forgot-password` / `/reset-password`, but **the backend didn't
    implement either endpoint** — every attempt was a 404 until this pass.
  - New `/app/org/plans` — the authenticated fallback for an Org Owner whose
    organization isn't subscribed (unsubscribed `DRAFT`, or lapsed `SUSPENDED`/
    `CANCELLED`): copy adapts to which case it is, and picking a plan there reuses the
    same Razorpay checkout pattern. `/app`'s post-login routing now redirects an Owner
    straight here instead of the dashboard whenever their org isn't in good standing —
    this also means an Owner **can** log in immediately after creating an account, even
    before paying for a plan, and gets routed to finish subscribing rather than being
    locked out.
  - New `/app/platform/plans`, `/app/platform/subscriptions`, `/app/platform/trials` —
    real screens replacing the mock catch-all versions; plan create/edit/deactivate is
    restricted client-side to Super Admin, matching the backend.
  - New `/app/platform/organizations` — real table of every tenant with a working
    "New organization" dialog, replacing the mock catch-all version.
  - New `/app/platform/leads` and `/app/platform/demo-requests` — real pipeline boards
    (status, assignment, notes) against the real backend, replacing mock data.
  - `app.index.tsx`'s platform dashboard "Demo → Trial → Subscription pipeline" and
    "Plan distribution" cards are now computed from real leads/subscriptions data
    instead of hardcoded numbers.
  - Website Builder's branding page (`/app/cms/branding`) gained a template picker
    (fetches the real `WebsiteTemplate` catalog) plus font/background-color/text-size
    fields; the "online booking" toggle was removed since booking is now mandatory on
    every published site. New `/app/platform/cms` — real editor for MediUnivers' own
    site content plus a template catalog CRUD panel (both audiences), replacing the mock
    catch-all version.
  - `/site/$slug` (the public organization site) always shows the booking section now
    (previously gated by a config toggle) and has a "Sign in" link to `/login` in the
    header.

- **Website Builder — the frontend didn't exist until this pass** (the backend was
  already fully built): six new admin screens under `/app/cms/*`
  (`branding`, `services`, `gallery`, `testimonials`, `blogs`, `enquiries`) covering
  every item from the spec — logo, brand colors, organization info, home/about page
  content, services, gallery, testimonials, blog posts, contact info, social links, SEO,
  and a publish toggle with a live site-URL preview. Plus the actual public-facing
  template: `/site/$slug` (hero, about, services, doctors, departments, gallery,
  testimonials, blog list, a working contact form, and an online booking widget with no
  login required) and `/site/$slug/blog/$blogSlug` for individual posts. Since this
  environment can't do real subdomain routing, the slug is a path segment
  (`/site/sunrise`) rather than a subdomain (`sunrise.mediunivers.com`) — the API is
  identical either way, so wiring real subdomains later is an infrastructure change,
  not an application one.
- Along the way, found and fixed two backend files (`WebsiteTestimonial`,
  `WebsiteBlogPost`) that had been overwritten with a schema that didn't match their own
  DTOs, and added the `PublicWebsiteController` that exposes the already-built
  `PublicWebsiteService` — none of the public site or contact/booking endpoints were
  reachable until that was added.

- **Real Organization Foundation, wired to the backend end to end** — no more
  "hand out a temp password" flow:
  - `/app/org/settings` — the organization's real profile (name, address, GST number,
    website...) and operational defaults (date/time format, appointment slot/buffer
    minutes), editable by the Owner/Admin, read-only for everyone else.
  - `/app/org/branches` — real branch list with lifecycle status and per-branch enabled
    modules; creating a new one is subject to the actual subscription branch limit, with
    a clear error when it's reached rather than silently failing.
  - `/app/org/users` — invitations, not passwords: adding a user sends them a setup link
    instead of a temp password, with branch-scope selection (all branches vs a hand-picked
    subset), and a "Resend" action for anyone still sitting in `INVITED`.
  - `/accept-invite?token=...` — the new public page someone lands on from their
    invitation link: shows who invited them and to what role, lets them set their own
    password, then sends them to sign in.
  - Organization status now has the full 8-state lifecycle
    (`DRAFT`/`PENDING_VERIFICATION`/`TRIAL`/`ACTIVE`/`GRACE_PERIOD`/`SUSPENDED`/`CANCELLED`/`ARCHIVED`)
    instead of the old 4-state placeholder, matching what the backend now enforces at
    login and at the API layer.

- **Configurable GST + Razorpay checkout** on `/app/billing/invoices`:
  - Every invoice detail view now shows a "Pay online" button alongside the existing
    manual "Record payment" form. It opens Razorpay's checkout widget for the exact
    outstanding balance (GST already included, since it was calculated into the invoice
    at creation time), then verifies the result with the backend before marking the
    invoice paid — the checkout script (`checkout.razorpay.com/v1/checkout.js`) loads
    on demand, once, the first time it's needed.
  - Adding the Doctor's consultation-fee GST field to `/app/clinic/doctors`, sourced
    from the same org-configurable Tax Rule list Pharmacy already used — GST is now
    configurable across Clinic, Pharmacy and Laboratory consistently, not just Pharmacy.
  - Caught a real bug during verification: the initial payment-online wiring called
    `useState` after an early `return` in the component, which violates React's Rules
    of Hooks. ESLint caught it; fixed by moving the state declaration to the top of the
    component with the rest.

- **Real, centralized Billing**, wired to the backend end to end:
  - `/app/billing/invoices` — every invoice generated across Clinic, Pharmacy and
    Laboratory, filterable by status, with a detail view showing line items, payment
    history, and a "collect payment" form supporting partial payments across cash/UPI/
    card/bank transfer.
  - Invoices now appear automatically: complete a consultation and a fee invoice is
    created; create a lab order and a test-charges invoice is created; complete a
    pharmacy sale and a paid invoice is created — no separate "create invoice" step
    anywhere in the UI, matching how the backend generates them.
  - `billing` is a new nav group, always visible to any tenant role that's granted it
    (not subject to the "needs plan upgrade" gating Clinic/Pharmacy/Lab have) since
    every organization needs billing regardless of subscription tier.

- **Real Laboratory module**, wired to the backend end to end:
  - `/app/lab/tests` — test master with category, sample type, price, TAT, and
    reference-range editor (min/max/critical, by gender and age band).
  - `/app/lab/orders` — book a lab order (direct or from a doctor), track it through
    Sample Pending → Collected → Processing → Result Ready → Verified, collect the
    sample and mark processing right from the order list.
  - `/app/lab/results` — enter results per test with a live LOW/NORMAL/HIGH/CRITICAL
    badge computed against the reference range, then select entered results to verify;
    verified results become read-only in the UI.
  - `/app/lab/reports` — a printable report view (organization header, patient/doctor,
    results table with flags) that only becomes available once every result on the
    order is verified — uses the browser's print-to-PDF rather than a dedicated PDF
    service for now.
  Same gating pattern as Clinic and Pharmacy: an org without Laboratory enabled gets a
  clear "isn't part of this organization" screen.

- **Real Pharmacy module**, wired to the backend end to end:
  - `/app/pharmacy/medicines` — catalog list/search/create, per-branch stock levels,
    reorder-level and controlled-medicine badges.
  - `/app/pharmacy/suppliers` — supplier list/create.
  - `/app/pharmacy/purchases` — create purchase orders, and receive goods (GRN) either
    against a PO or directly, which is what actually creates batches.
  - `/app/pharmacy/stock` — low-stock and expiring-soon alerts, plus branch-to-branch
    stock transfers.
  - `/app/pharmacy/dispensing` — the prescription queue (fed automatically by completed
    Clinic consultations), with a dispense workspace showing what the doctor prescribed
    next to a cart for matching it to the catalog.
  - `/app/pharmacy/sales` — walk-in counter sales (cart → FIFO allocation → totals) and
    sales history.
  - `/app/pharmacy/returns` — process a full or partial return against an original sale,
    with a mandatory reason and refund method.
  All gated the same way as Clinic: an org without Pharmacy enabled gets a clear
  "isn't part of this organization" screen instead of silently broken pages.

- **Real Clinic module**, wired to the backend end to end (no more mock data for these):
  - `/app/clinic/patients` — registration, search, profile, family members.
  - `/app/clinic/doctors` — adding a doctor (creates their login too), specializations,
    weekly availability editor.
  - `/app/clinic/appointments` — booking, walk-in check-in with an immediate token, and
    the live status queue (check in / cancel / start consultation).
  - `/app/clinic/consultations` — the doctor's EMR workspace: vitals, clinical notes,
    diagnosis, a repeatable prescription builder, follow-up scheduling.
  All four redirect to a clear "Clinic isn't part of this organization" or "needs plan
  upgrade" state instead of silently showing nothing, using the same
  `usePermissions().isUnavailable()` check the sidebar already relies on.

- **Real OAuth2 login**, replacing the client-side mock entirely: `src/lib/pkce.ts` (PKCE helpers),
  `src/lib/oauth.ts` (starts the authorize redirect), `src/lib/api.ts` (token storage + authenticated
  fetch wrapper), `src/routes/oauth.callback.tsx` (code exchange + `/api/me` hydration).
- `/app`'s auth guard now also tries to **rehydrate the session from a stored token on page refresh**
  (calling `/api/me`) before falling back to `/login`, so a hard refresh doesn't always bounce you out.
- `authSlice` tracks the **actually-authenticated role** separately from whatever the preview switcher is
  showing, so the UI can warn you when they diverge instead of silently pretending a preview is real.
- Logout now clears the stored access/refresh tokens, not just Redux state.

## Roadmap (matches the phased plan in the product doc)

Phase 1 (Foundation, auth, platform console, org/subscription management, marketing
site), the **Clinic module**, the **Pharmacy module**, the **Laboratory module**, the
**centralized Billing Engine**, the full **Organization Foundation** (lifecycle, branches,
invitations), the **Website Builder** (branding, pages, services, gallery, testimonials,
blog, contact forms, mandatory online booking, a real public site template, and a
platform-managed template catalog for both audiences), and now the **Subscription
Engine + self-serve signup** (real plan pricing/admin, separated account-creation and
plan-purchase flows, free trial, forgot/reset password, and a real demo-request/lead
pipeline) are all real, backend-backed features — not mock data.

Still mock, no backend built yet: `platform/coupons`, `platform/referrals`,
`platform/support`, `platform/audit-logs`, platform user/role admin CRUD, and full CRM
(follow-up scheduling, campaigns, activity timelines) beyond the lead pipeline above.

## Stack

React 19 · TypeScript · TanStack Start · TanStack Router · Redux Toolkit · React Query · Tailwind CSS ·
shadcn/ui · React Hook Form · Zod · OAuth2 (Authorization Code + PKCE) against a Spring Boot backend


## Frontend quality updates

The updated frontend centralizes browser API traffic through the Axios client in `src/lib/api.ts`.

### Forms
- Required fields show a red `*`.
- Submit validates the entire form, focuses the first invalid field, scrolls it into view, and shows the error under the field.
- Errors clear immediately when the user corrects the value.
- Email validation uses a strict email pattern.
- Indian phone inputs default to `+91`, accept only digits, enforce a 10-digit Indian mobile number, and reject alphabetic characters.
- Option fields use `react-select`; multi-select fields support search and multiple values.
- Server/API field errors are displayed back on the relevant form controls.

### Tables and reports
- Search is debounced.
- Loading states use skeletons.
- Responsive desktop tables switch to mobile cards without horizontal layout breakage.
- Date-aware modules expose From/To filters.
- Exports use the currently filtered dataset and support Excel (`.xlsx`) and PDF (`.pdf`).

### New dependencies
Run `npm install` after extracting the project. The project now includes:
- `react-select`
- `jspdf`
- `jspdf-autotable`
- `xlsx`

All application API calls should use `apiFetch`, `apiFetchPublic`, or the typed `apiGet/apiPost/apiPut/apiPatch/apiDelete` helpers instead of calling `fetch()` directly.
