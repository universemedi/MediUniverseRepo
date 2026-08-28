package com.MediUnivers.service.security;

import com.MediUnivers.service.domain.AppUser;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Spring Security principal wrapping our AppUser. The user's role CODE becomes
 * a "ROLE_<code>" authority and their PORTAL becomes a "PORTAL_<portal>"
 * authority so both can be used in @PreAuthorize expressions and JWT claims.
 */
public class AppUserPrincipal implements UserDetails {

    private final AppUser user;

    public AppUserPrincipal(AppUser user) {
        this.user = user;
    }

    public AppUser getUser() {
        return user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().getCode()),
                new SimpleGrantedAuthority("PORTAL_" + user.getPortal().name())
        );
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return user.getStatus() != com.MediUnivers.service.domain.UserStatus.DISABLED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        if (user.getStatus() != com.MediUnivers.service.domain.UserStatus.ACTIVE) return false;
        if (user.getPortal() == com.MediUnivers.service.domain.Portal.PLATFORM) return true;
        com.MediUnivers.service.domain.Organization org = user.getOrganization();
        if (org == null) return true;
        // Organization lifecycle login rules (Organization Foundation spec §13).
        return switch (org.getStatus()) {
            case DRAFT, PENDING_VERIFICATION, ARCHIVED -> false;
            // Suspended/cancelled orgs still let the owner in to pay or wind down —
            // everyone else is locked out until the owner resolves it.
            case SUSPENDED, CANCELLED -> "ORG_OWNER".equals(user.getRole().getCode());
            case TRIAL, ACTIVE, GRACE_PERIOD -> true;
        };
    }
}
