package com.MediUnivers.service.config;

import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Collection;

/**
 * Validates the same bearer access token the SPA already holds (sessionStorage,
 * attached as "Authorization: Bearer ..." on every REST call) on the STOMP CONNECT
 * frame, then gates each SUBSCRIBE to only the caller's own org channel (or the
 * platform channel for platform staff) — a tenant must never be able to listen in
 * on another organization's broadcasts just by knowing its id.
 */
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtDecoder jwtDecoder;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new MessagingException("Missing bearer token on WebSocket CONNECT.");
            }
            try {
                Jwt jwt = jwtDecoder.decode(authHeader.substring(7));
                accessor.setUser(toAuthentication(jwt));
            } catch (JwtException ex) {
                throw new MessagingException("Invalid or expired token.", ex);
            }
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            requireAuthorizedDestination(accessor);
        }

        return message;
    }

    private void requireAuthorizedDestination(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        Principal user = accessor.getUser();
        if (destination == null || !(user instanceof JwtAuthenticationToken token)) {
            throw new MessagingException("Unauthenticated WebSocket subscription.");
        }
        Jwt jwt = token.getToken();
        boolean isPlatform = "PLATFORM".equals(jwt.getClaimAsString("portal"));

        if (destination.startsWith("/topic/org/")) {
            String requestedOrgId = destination.substring("/topic/org/".length());
            Object orgIdClaim = jwt.getClaim("org_id");
            boolean sameOrg = orgIdClaim != null && requestedOrgId.equals(String.valueOf(orgIdClaim));
            if (!isPlatform && !sameOrg) {
                throw new MessagingException("Not authorized to subscribe to " + destination);
            }
        } else if (destination.startsWith("/topic/platform")) {
            if (!isPlatform) {
                throw new MessagingException("Not authorized to subscribe to " + destination);
            }
        } else {
            throw new MessagingException("Unknown destination: " + destination);
        }
    }

    private JwtAuthenticationToken toAuthentication(Jwt jwt) {
        Collection<GrantedAuthority> authorities = new ArrayList<>();
        String role = jwt.getClaimAsString("role");
        String portal = jwt.getClaimAsString("portal");
        if (role != null) authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
        if (portal != null) authorities.add(new SimpleGrantedAuthority("PORTAL_" + portal));
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }
}
