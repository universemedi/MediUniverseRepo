package com.MediUnivers.service.service;

import com.MediUnivers.service.config.AppProperties;
import com.MediUnivers.service.domain.*;
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
import java.util.Set;
import java.util.UUID;

/**
 * The one user-invitation mechanism for every tenant user — the Org Owner
 * created alongside a new organization, and every user an Org Admin adds
 * afterwards (spec §29): created as INVITED with a single-use token instead
 * of a password, emailed a link (logged here in place of real email
 * delivery), and only becomes ACTIVE once they open it and set their own
 * password. A user can't sign in at all while INVITED —
 * {@code AppUserPrincipal.isEnabled()} only allows ACTIVE accounts through.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UserInvitationService {

    private static final int INVITE_VALID_DAYS = 7;

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final AppProperties appProperties;

    public AppUser invite(Organization organization, Portal portal, Role role, String fullName, String email,
                           Branch primaryBranch, BranchScope branchScope, Set<Branch> selectedBranches) {
        if (appUserRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPortal(portal);
        user.setRole(role);
        user.setOrganization(organization);
        user.setBranch(primaryBranch);
        user.setBranchScope(branchScope);
        if (selectedBranches != null) user.getSelectedBranches().addAll(selectedBranches);
        // No password yet — INVITED accounts can't log in regardless of what's here;
        // this is just a non-null placeholder no one will ever type in.
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setStatus(UserStatus.INVITED);
        stampNewToken(user);
        appUserRepository.save(user);
        logInvitation(user);
        notifyInvited(user);
        return user;
    }

    public AppUser resend(Organization organization, Long userId) {
        AppUser user = appUserRepository.findById(userId)
                .filter(u -> organization == null || (u.getOrganization() != null && u.getOrganization().getId().equals(organization.getId())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        if (user.getStatus() != UserStatus.INVITED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This user has already accepted their invitation.");
        }
        stampNewToken(user);
        appUserRepository.save(user);
        logInvitation(user);
        notifyInvited(user);
        return user;
    }

    public AppUser accept(String token, String newPassword) {
        AppUser user = appUserRepository.findByInviteToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "This invitation link is invalid."));
        if (user.getStatus() != UserStatus.INVITED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This invitation has already been used.");
        }
        if (user.getInviteExpiresAt() == null || user.getInviteExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This invitation link has expired — ask an admin to resend it.");
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setStatus(UserStatus.ACTIVE);
        user.setInviteToken(null);
        user.setInviteExpiresAt(null);
        return appUserRepository.save(user);
    }

    @Transactional(readOnly = true)
    public AppUser previewInvitation(String token) {
        AppUser user = appUserRepository.findByInviteToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "This invitation link is invalid."));
        if (user.getStatus() != UserStatus.INVITED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This invitation has already been used.");
        }
        return user;
    }

    private void stampNewToken(AppUser user) {
        user.setInviteToken(UUID.randomUUID().toString().replace("-", ""));
        user.setInviteExpiresAt(Instant.now().plus(INVITE_VALID_DAYS, ChronoUnit.DAYS));
    }

    /** Stands in for real email delivery — logs the link an org's welcome/invite email would contain. */
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserInvitationService.class);

    private void logInvitation(AppUser user) {
        log.info("Invitation for {} ({}): accept at /accept-invite?token={} — expires {}",
                user.getEmail(), user.getRole().getName(), user.getInviteToken(), user.getInviteExpiresAt());
    }

    /** Routes the actual invite email through the Communication Engine — platform-staff invites (no organization) skip it: there's no org to pull channel settings/templates from. */
    private void notifyInvited(AppUser user) {
        if (user.getOrganization() == null) return;
        Map<String, String> vars = new HashMap<>();
        vars.put("fullName", user.getFullName());
        vars.put("organizationName", user.getOrganization().getName());
        vars.put("roleName", user.getRole().getName());
        vars.put("inviteLink", appProperties.frontendBaseUrl() + "/accept-invite?token=" + user.getInviteToken());
        vars.put("expiresAt", user.getInviteExpiresAt() != null
                ? DateTimeFormatter.ISO_INSTANT.format(user.getInviteExpiresAt()) : "");
        notificationService.notify(user.getOrganization(), NotificationEventType.USER_INVITED,
                NotificationRecipient.of(user.getFullName(), user.getEmail(), null),
                vars, NotificationPriority.HIGH, "APP_USER", user.getId(), null);
    }
}
