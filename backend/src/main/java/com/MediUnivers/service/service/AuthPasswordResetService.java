package com.MediUnivers.service.service;

import com.MediUnivers.service.config.AppProperties;
import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.NotificationEventType;
import com.MediUnivers.service.domain.NotificationPriority;
import com.MediUnivers.service.domain.UserStatus;
import com.MediUnivers.service.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * The "forgot my password" flow for an already-usable (ACTIVE) account —
 * distinct from {@link UserInvitationService}'s invite-token mechanism, which
 * only applies while a brand-new account is still INVITED. Both are needed:
 * this one serves a returning user, that one serves a freshly created account.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AuthPasswordResetService {

    private static final int RESET_VALID_MINUTES = 15;

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final AppProperties appProperties;

    /**
     * Always succeeds from the caller's point of view, whether or not the
     * email matches an account — standard practice to avoid leaking which
     * emails have accounts.
     */
    public void requestReset(String email) {
        appUserRepository.findByEmailIgnoreCase(email)
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .ifPresent(this::stampAndNotify);
    }

    public void resetPassword(String token, String newPassword) {
        AppUser user = appUserRepository.findByResetToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "This reset link is invalid."));
        if (user.getResetTokenExpiresAt() == null || user.getResetTokenExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This reset link has expired — request a new one.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiresAt(null);
        appUserRepository.save(user);
    }

    private void stampAndNotify(AppUser user) {
        user.setResetToken(UUID.randomUUID().toString().replace("-", ""));
        user.setResetTokenExpiresAt(Instant.now().plus(RESET_VALID_MINUTES, ChronoUnit.MINUTES));
        appUserRepository.save(user);

        // Platform staff have no organization, so there's no NotificationTemplate
        // catalog to render from — same accepted limitation as invite emails today.
        if (user.getOrganization() == null) return;

        Map<String, String> vars = new HashMap<>();
        vars.put("fullName", user.getFullName());
        vars.put("resetLink", appProperties.frontendBaseUrl() + "/reset-password?token=" + user.getResetToken());
        vars.put("expiresAt", DateTimeFormatter.ISO_INSTANT.format(user.getResetTokenExpiresAt()));

        notificationService.notify(user.getOrganization(), NotificationEventType.PASSWORD_RESET_REQUESTED,
                NotificationRecipient.of(user.getFullName(), user.getEmail(), null),
                vars, NotificationPriority.HIGH, "APP_USER", user.getId(), null);
    }
}
