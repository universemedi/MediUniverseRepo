// import { useEffect, useRef, useState } from "react";
// import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
// import { AppSidebar } from "@/components/layout/AppSidebar";
// import { Topbar } from "@/components/layout/Topbar";
// import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
// import { useAppDispatch, useAppSelector } from "@/store";
// import { loginSuccess } from "@/store/slices/authSlice";
// import { hydrateFromOrganization } from "@/store/slices/tenantSlice";
// import { apiFetch, clearTokens, getAccessToken } from "@/lib/api";
// import type { MeResponse } from "@/lib/types";
// import { Loader2 } from "lucide-react";

// export const Route = createFileRoute("/app")({
//   head: () => ({
//     meta: [
//       { title: "MediUnivers Console — Healthcare Operations" },
//       {
//         name: "description",
//         content:
//           "Role-based console for clinics, pharmacies and laboratories running on MediUnivers.",
//       },
//       { property: "og:title", content: "MediUnivers Console" },
//       { property: "og:description", content: "Role-based healthcare operations console." },
//     ],
//   }),
//   component: AppLayout,
// });

// function AppLayout() {
//   const status = useAppSelector((s) => s.auth.status);
//   const dispatch = useAppDispatch();
//   const navigate = useNavigate();
//   const pathname = useRouterState({ select: (r) => r.location.pathname });
//   const [rehydrating, setRehydrating] = useState(true);
//   const tried = useRef(false);

//   // On a hard refresh, Redux resets but the access token (sessionStorage) can
//   // still be valid — try to rehydrate the session from /api/me before
//   // deciding to send the person back to /login.
//   useEffect(() => {
//     if (tried.current) return;
//     tried.current = true;

//     if (status === "authenticated") {
//       setRehydrating(false);
//       return;
//     }

//     const token = getAccessToken();
//     if (!token) {
//       setRehydrating(false);
//       return;
//     }

//     apiFetch<MeResponse>("/api/me")
//       .then((me) => {
//         dispatch(
//           loginSuccess({
//             id: String(me.userId),
//             name: me.name,
//             email: me.email,
//             role: me.role.code,
//             organization: me.organization?.name ?? "MediUnivers Platform",
//             branch: me.branchName ?? "",
//           }),
//         );
//         if (me.organization) dispatch(hydrateFromOrganization(me.organization));
//       })
//       .catch(() => {
//         clearTokens();
//       })
//       .finally(() => setRehydrating(false));
//   }, [status, dispatch]);

//   useEffect(() => {
//     if (rehydrating) return;
//     if (status !== "authenticated") {
//       navigate({ to: "/login", search: { redirect: pathname }, replace: true });
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [status, rehydrating]);

//   // Not authenticated yet (or we're mid-redirect/rehydration): don't flash protected content.
//   if (rehydrating || status !== "authenticated") {
//     return (
//       <div className="flex min-h-screen w-full items-center justify-center bg-background">
//         <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
//       </div>
//     );
//   }

//   return (
//     <SidebarProvider>
//       <div className="flex min-h-screen w-full bg-background">
//         <AppSidebar />
//         <SidebarInset className="min-w-0 bg-background">
//           <Topbar />
//           <main className="min-w-0 flex-1 p-4 md:p-6">
//             <Outlet />
//           </main>
//         </SidebarInset>
//       </div>
//     </SidebarProvider>
//   );
// }

import { useEffect, useRef, useState } from "react";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAppDispatch, useAppSelector } from "@/store";
import { loginSuccess, type AuthUser } from "@/store/slices/authSlice";
import { hydrateFromOrganization } from "@/store/slices/tenantSlice";
import { apiFetch, clearTokens, getAccessToken } from "@/lib/api";
import type { RoleKey } from "@/lib/rbac";
import type { MeResponse } from "@/lib/types";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "MediUnivers Console — Healthcare Operations" },
      {
        name: "description",
        content:
          "Role-based console for clinics, pharmacies and laboratories running on MediUnivers.",
      },
      { property: "og:title", content: "MediUnivers Console" },
      { property: "og:description", content: "Role-based healthcare operations console." },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const status = useAppSelector((s) => s.auth.status);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [rehydrating, setRehydrating] = useState(true);
  const tried = useRef(false);

  // On hard refresh, Redux memory resets but the access token in sessionStorage remains.
  // Rehydrate the session from /api/me before deciding whether to redirect.
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;

    if (status === "authenticated") {
      setRehydrating(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setRehydrating(false);
      return;
    }

    apiFetch<MeResponse>("/api/me")
      .then((me) => {
        const rawOrg = me.organization as unknown as Record<string, unknown> | undefined;
        const resolvedOrgType =
          rawOrg?.["type"] ?? rawOrg?.["orgType"] ?? rawOrg?.["organizationType"];
        const resolvedPlanCode =
          rawOrg?.["planCode"] ??
          (typeof rawOrg?.["plan"] === "object" && rawOrg?.["plan"] !== null
            ? (rawOrg["plan"] as Record<string, unknown>)["code"]
            : undefined);

        const authUser: AuthUser = {
          id: String(me.userId),
          name: me.name,
          email: me.email,
          role: me.role.code as RoleKey,
          organization: me.organization?.name ?? "MediUnivers Platform",
          branch: me.branchName ?? "",
          ...(rawOrg?.["id"] != null ? { orgId: String(rawOrg["id"]) } : {}),
          ...(resolvedOrgType != null ? { orgType: String(resolvedOrgType) } : {}),
          ...(resolvedPlanCode != null ? { planCode: String(resolvedPlanCode) } : {}),
        };

        dispatch(
          loginSuccess({
            user: authUser,
            token,
          }),
        );

        if (me.organization) {
          dispatch(hydrateFromOrganization(me.organization));
        }
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => {
        setRehydrating(false);
      });
  }, [status, dispatch]);

  useEffect(() => {
    if (rehydrating) return;
    if (status !== "authenticated") {
      navigate({ to: "/login", search: { redirect: pathname }, replace: true });
    }
  }, [status, rehydrating, navigate, pathname]);

  // Prevent flash of protected content during rehydration
  if (rehydrating || status !== "authenticated") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <Topbar />
          <main className="min-w-0 flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
