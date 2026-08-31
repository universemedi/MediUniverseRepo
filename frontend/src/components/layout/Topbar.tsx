import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Check, ChevronDown, LogOut, Menu, Moon, Search, Sun, User } from "lucide-react";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { logout, setBranch, setRole } from "@/store/slices/authSlice";
import { markAllRead, markRead } from "@/store/slices/notificationsSlice";
import { toggleMode } from "@/store/slices/themeSlice";
import {
  ROLES,
  PORTAL_LABEL,
  type GroupAccess,
  type ModuleGroup,
  type Portal,
  type RoleKey,
} from "@/lib/rbac";
import { PLANS } from "@/lib/plans";
import { setPlan } from "@/store/slices/tenantSlice";
import { MODULES } from "@/config/modules";
import { moduleLinkProps } from "@/config/nav";
import { usePermissions } from "@/hooks/usePermissions";
import { ThemePanel } from "@/components/layout/ThemePanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { clearTokens, logoutUser } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

/**
 * Everything here is a DEMO identity switcher — in the real product a user
 * only ever has one role, one org and one branch (whatever their account was
 * given), and none of this UI would exist. It's grouped into a single
 * "Preview" popover so testers can jump between roles/plans without logging
 * out, without it crowding the topbar or overflowing small screens.
 */
const BUSINESS_GROUPS: ModuleGroup[] = ["clinic", "pharmacy", "lab", "crm", "cms"];

/**
 * Whether a role is worth offering in the tenant preview list for this
 * organization — a role built entirely around a module the org's plan/business
 * type doesn't currently include (e.g. Pharmacist with no pharmacy) is just
 * noise. Roles that also touch at least one module the org does have (or
 * that don't specialize in any single business module, like Org Owner/Admin,
 * which grant every group) are still shown.
 */
function roleFitsSubscription(access: GroupAccess, availableModules: ModuleGroup[]) {
  const businessGroups = BUSINESS_GROUPS.filter((g) => access[g]);
  if (businessGroups.length === 0) return true;
  return businessGroups.some((g) => availableModules.includes(g));
}

function PreviewSwitcher() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const authenticatedRole = useAppSelector((s) => s.auth.authenticatedRole);
  const tenant = useAppSelector((s) => s.tenant);
  const { isPlatform } = usePermissions();
  const previewing = user?.role !== authenticatedRole;

  // Real modules this org's plan AND business type both allow — same rule usePermissions()
  // enforces everywhere else. Only filters when the signed-in account IS a tenant user —
  // platform staff have no real subscription of their own, so they can preview any role.
  const availableModules = tenant.planModules.filter((g) => tenant.orgTypeModules.includes(g));
  const tenantRoles = ROLES.filter(
    (r) =>
      r.portal === "tenant" && (isPlatform || roleFitsSubscription(r.access, availableModules)),
  );
  const customRoles = tenant.customRoles.filter(
    (r) => isPlatform || roleFitsSubscription(r.access, availableModules),
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="hidden h-9 items-center gap-1.5 sm:flex">
          <span className="max-w-[9rem] truncate">
            {isPlatform ? "MediUnivers" : tenant.orgName}
          </span>
          {previewing ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Demo preview controls
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Switch identity to see how role, plan and organization type change what's visible.
          </p>
          {previewing ? (
            <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
              You're previewing a different role than your signed-in account. This only changes what
              the UI shows — API calls still use your real account's permissions.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Role</label>
          <Select
            value={user?.role ?? "SUPER_ADMIN"}
            onValueChange={(v) => dispatch(setRole(v as RoleKey))}
          >
            <SelectTrigger className="h-9" aria-label="Switch role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-96">
              {(["platform", "tenant", "patient"] as Portal[]).map((p) => (
                <SelectGroup key={p}>
                  <SelectLabel className="text-[10px] uppercase tracking-wide">
                    {PORTAL_LABEL[p]}
                  </SelectLabel>
                  {(p === "tenant" ? tenantRoles : ROLES.filter((r) => r.portal === p)).map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.name}
                    </SelectItem>
                  ))}
                  {p === "tenant" && customRoles.length ? (
                    <>
                      <SelectLabel className="text-[10px] uppercase tracking-wide">
                        Roles created by this org
                      </SelectLabel>
                      {customRoles.map((r) => (
                        <SelectItem key={r.key} value={r.key}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </>
                  ) : null}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isPlatform ? (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Subscription plan</label>
              <Select value={tenant.planCode} onValueChange={(v) => dispatch(setPlan(v))}>
                <SelectTrigger className="h-9" aria-label="Subscription plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Branch</label>
              <Select
                value={user?.branch ?? "Head Office"}
                onValueChange={(v) => dispatch(setBranch(v))}
              >
                <SelectTrigger className="h-9" aria-label="Switch branch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tenant.branches.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Real (non-demo) tenant context: shown only to Organization Owner/Admin — the
 * two roles with unrestricted org access. The plan is informational only (no
 * switcher — subscriptions are bought via the billing flow at /app/org/plans,
 * never toggled from a menu), and the branch is a dropdown only when the
 * organization actually has more than one.
 */
function OrgContextBar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const tenant = useAppSelector((s) => s.tenant);

  const branchRecords = tenant.branchRecords.length ? tenant.branchRecords : null;
  const singleBranchName = branchRecords?.[0]?.name ?? tenant.branches[0] ?? "Head Office";
  const isMultiBranch = (branchRecords?.length ?? tenant.branches.length) > 1;
  const canUpgrade = tenant.planCode !== "ENTERPRISE";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="hidden h-9 items-center gap-1.5 sm:flex">
          <span className="max-w-[9rem] truncate">{tenant.orgName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Subscription plan</label>
          <div className="flex items-center justify-between gap-2 rounded-md border border-input bg-muted/30 px-3 py-2">
            <div>
              <p className="text-sm font-medium leading-tight">{tenant.planName}</p>
              <p className="text-[11px] text-muted-foreground">
                {tenant.planFreeTrial ? "Trial ends" : "Renews"} {tenant.renewsOn}
              </p>
            </div>
            {canUpgrade ? (
              <Button
                size="sm"
                className="h-7 shrink-0 text-xs"
                onClick={() => navigate({ to: "/app/org/plans" })}
              >
                Upgrade
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Branch</label>
          {isMultiBranch ? (
            <Select
              value={user?.branch ?? singleBranchName}
              onValueChange={(v) => dispatch(setBranch(v))}
            >
              <SelectTrigger className="h-9" aria-label="Switch branch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tenant.branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
              {singleBranchName}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Topbar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const authenticatedRole = useAppSelector((s) => s.auth.authenticatedRole);
  const mode = useAppSelector((s) => s.theme.mode);
  const notifications = useAppSelector((s) => s.notifications.items);
  const { canAccessPath, roleName, isPlatform, plan, orgName } = usePermissions();
  const [open, setOpen] = useState(false);

  // The demo role/plan/branch preview tool is a testing aid for the platform
  // owner only — real tenant users (Org Owner/Admin included) never get an
  // editable identity switcher. Org Owner/Admin instead see a small read-only
  // context bar (plan + expiry + upgrade, branch if there's more than one);
  // every other tenant/platform/patient role sees nothing here at all.
  const showDemoSwitcher = authenticatedRole === "SUPER_ADMIN";
  const showOrgContext = authenticatedRole === "ORG_OWNER" || authenticatedRole === "ORG_ADMIN";

  const unread = notifications.filter((n) => !n.read).length;
  const searchable = MODULES.filter((m) => canAccessPath(m.path));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur md:px-5">
      <SidebarTrigger className="shrink-0">
        <Menu className="h-4 w-4" />
      </SidebarTrigger>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-1 hidden h-9 w-64 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent md:flex"
      >
        <Search className="h-4 w-4" />
        Search modules...
        <kbd className="ml-auto rounded border border-border px-1.5 text-[10px]">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>

        {showDemoSwitcher ? <PreviewSwitcher /> : showOrgContext ? <OrgContextBar /> : null}

        <Button
          variant="outline"
          size="icon"
          onClick={() => dispatch(toggleMode())}
          aria-label="Toggle dark mode"
        >
          {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {unread ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => dispatch(markAllRead())}
              >
                <Check className="h-3 w-3" />
                Mark all read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => dispatch(markRead(n.id))}
                  className={cn(
                    "flex flex-col items-start gap-0.5 py-2",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.body}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {n.time}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemePanel />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2 transition-colors hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {(user?.name ?? "MU")
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-medium leading-tight">{user?.name}</span>
                <span className="block text-[10px] leading-tight text-muted-foreground">
                  {roleName}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
              <Badge
                variant="outline"
                className="mt-2 border-primary/25 bg-primary/10 text-primary"
              >
                {roleName}
              </Badge>
              <p className="mt-2 text-[11px] font-normal text-muted-foreground">
                {isPlatform
                  ? "MediUnivers product owner console"
                  : `${orgName} · ${plan.name} plan`}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app">
                <User className="h-4 w-4" />
                My workspace
              </Link>
            </DropdownMenuItem>
            {/* <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                clearTokens();
                dispatch(logout());
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem> */}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={async () => {
                dispatch(logout());
                await logoutUser();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search modules and pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Modules">
            {searchable.map((m) => (
              <CommandItem
                key={m.path}
                value={`${m.title} ${m.group}`}
                onSelect={() => {
                  setOpen(false);
                  navigate(moduleLinkProps(m.path));
                }}
              >
                <span>{m.title}</span>
                <span className="ml-auto text-xs uppercase text-muted-foreground">{m.group}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
