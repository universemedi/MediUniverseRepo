package com.MediUnivers.service.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

/**
 * Thin wrapper around {@link SimpMessagingTemplate} so the rest of the codebase never
 * touches STOMP destinations directly — one org-scoped channel (/topic/org/{id}) and one
 * platform-wide channel (/topic/platform), matching what {@link
 * com.MediUnivers.service.config.WebSocketAuthChannelInterceptor} authorizes subscriptions
 * for. Every event is a small {type, payload, at} envelope so the frontend can dispatch on
 * `type` without needing a different message shape per event.
 */
@Service
@RequiredArgsConstructor
public class RealtimeEventService {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyOrg(Long organizationId, String eventType, Object payload) {
        if (organizationId == null) return;
        messagingTemplate.convertAndSend("/topic/org/" + organizationId, envelope(eventType, payload));
    }

    public void notifyPlatform(String eventType, Object payload) {
        messagingTemplate.convertAndSend("/topic/platform", envelope(eventType, payload));
    }

    private Map<String, Object> envelope(String eventType, Object payload) {
        return Map.of("type", eventType, "payload", payload, "at", Instant.now().toString());
    }
}
