import { useEffect } from "react";
import { Client } from "@stomp/stompjs";
import { API_BASE_URL, getAccessToken } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store";
import { usePermissions } from "@/hooks/usePermissions";
import { hydrateFromOrganization } from "@/store/slices/tenantSlice";
import type { OrganizationApiDto } from "@/lib/types";

interface RealtimeEvent {
  type: string;
  payload: unknown;
}

function wsUrl(): string {
  return API_BASE_URL.replace(/^http/, "ws") + "/ws";
}

/**
 * One STOMP connection per authenticated session, kept alive for as long as the user is
 * in /app — the backend push counterpart to the pieces of state that used to go stale
 * until a manual refresh (plan/module unlocks right now; more event types land here as
 * they're wired up backend-side, same envelope, no new subscription needed).
 */
export function useRealtimeUpdates() {
  const dispatch = useAppDispatch();
  const { isPlatform } = usePermissions();
  const authStatus = useAppSelector((s) => s.auth.status);
  const orgId = useAppSelector((s) => s.auth.user?.orgId);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    if (!isPlatform && !orgId) return;
    const token = getAccessToken();
    if (!token) return;

    const destination = isPlatform ? "/topic/platform" : `/topic/org/${orgId}`;

    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(destination, (message) => {
          let event: RealtimeEvent;
          try {
            event = JSON.parse(message.body) as RealtimeEvent;
          } catch {
            return;
          }
          if (event.type === "ORG_UPDATED") {
            dispatch(hydrateFromOrganization(event.payload as OrganizationApiDto));
          }
        });
      },
    });
    client.activate();

    return () => {
      void client.deactivate();
    };
  }, [authStatus, isPlatform, orgId, dispatch]);
}
