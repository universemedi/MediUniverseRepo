package com.MediUnivers.service.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Real-time push for state that would otherwise sit stale until the SPA is manually
 * refreshed — the plan/module-unlock desync (req: WebSocket) is the first consumer.
 * Auth happens per-frame in {@link WebSocketAuthChannelInterceptor}, not at the HTTP
 * handshake (see DefaultSecurityConfig, which permits /ws/** at the HTTP layer).
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtDecoder jwtDecoder;
    private final AppProperties appProperties;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Plain STOMP over a native WebSocket — no SockJS fallback layer, since every
        // supported browser here speaks WebSocket directly and it keeps the frontend
        // dependency list one package shorter.
        registry.addEndpoint("/ws").setAllowedOrigins(appProperties.frontendBaseUrl());
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // /topic/org/{id} and /topic/platform — broadcast-only for now, no client-to-server
        // application messages exist yet, so no /app prefix is wired up.
        registry.enableSimpleBroker("/topic");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new WebSocketAuthChannelInterceptor(jwtDecoder));
    }
}
