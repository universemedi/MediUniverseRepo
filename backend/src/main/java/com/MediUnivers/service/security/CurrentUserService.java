package com.MediUnivers.service.security;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/**
 * Resolves the AppUser behind the current request's JWT (the token's
 * "subject" is the user's email — see JwtAuthenticationConverter in
 * ResourceServerConfig / the "sub" claim Spring's OIDC provider sets from
 * the authenticated principal's username).
 */
@Component
@RequiredArgsConstructor
public class CurrentUserService {

    private final AppUserRepository appUserRepository;

    public AppUser require() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        String email = auth.getName();
        return appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account no longer exists"));
    }
}
