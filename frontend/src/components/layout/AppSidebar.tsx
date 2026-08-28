import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Lock } from "lucide-react";
import { NAV_SECTIONS, moduleLinkProps } from "@/config/nav";
import { usePermissions } from "@/hooks/usePermissions";
import { Icon } from "@/components/common/Icon";
import { LogoMark } from "@/components/common/Logo";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { reasonForGroup, reasonForPath, isPlatform, plan, orgName, roleName, portal } =
    usePermissions();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const sections = NAV_SECTIONS.map((section) => {
    const groupReason = reasonForGroup(section.group);
    const items = section.items.filter((i) => reasonForPath(i.path) === "ok");
    return { ...section, groupReason, items };
  }).filter((section) => {
    if (section.portal !== portal && !(isPlatform && section.group === "cms")) return false;
    // not part of this org's business at all — don't even hint it exists
    if (section.groupReason === "unavailable") return false;
    // plan-locked sections stay visible (as an upgrade hint) for org owners/admins
    if (section.groupReason === "plan") return true;
    return section.items.length > 0;
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/app" className="flex items-center gap-2 px-2 py-1.5">
          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg">
            <LogoMark />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight">
                {isPlatform ? "MediUnivers" : orgName}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {isPlatform ? "Product Owner Console" : `${plan.name} plan`}
              </span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/app"} tooltip="Dashboard">
                  <Link to="/app">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sections.map((section) => (
          <SidebarGroup key={section.group}>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Icon name={section.icon} className="h-3.5 w-3.5" />
              <span className="truncate">{section.label}</span>
              {section.groupReason === "plan" && !collapsed ? (
                <Badge variant="outline" className="ml-auto h-4 gap-1 px-1 text-[9px] uppercase">
                  <Lock className="h-2.5 w-2.5" /> Upgrade
                </Badge>
              ) : null}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.groupReason === "plan"
                  ? section.items.length === 0 && (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          tooltip={`${section.label} — requires a higher plan`}
                        >
                          <Link
                            to="/app/$"
                            params={{ _splat: "org/subscription" }}
                            className="opacity-60"
                          >
                            <Lock className="h-4 w-4" />
                            <span className="truncate">Unlock {section.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  : section.items.map((item) => (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.to}
                          tooltip={item.label}
                        >
                          <Link {...moduleLinkProps(item.path)} className="flex items-center gap-2">
                            <Icon name={item.icon} className="h-4 w-4" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {!collapsed ? (
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="px-2 py-1.5 text-[11px] leading-tight text-muted-foreground">
            <p className="font-medium text-foreground">{roleName}</p>
            <p className="truncate">
              {isPlatform ? "Platform staff access" : `Subscription: ${plan.name}`}
            </p>
          </div>
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}
