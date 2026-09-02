package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.Portal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmailIgnoreCase(String email);

    List<AppUser> findByOrganizationId(Long organizationId);

    /** Staff only (Portal.TENANT) — the Users admin screen and seat-limit checks must never
     * count or list an organization's Patient Portal accounts as staff. */
    List<AppUser> findByOrganizationIdAndPortal(Long organizationId, Portal portal);

    boolean existsByEmailIgnoreCase(String email);

    Optional<AppUser> findByInviteToken(String inviteToken);

    Optional<AppUser> findByResetToken(String resetToken);

    long countByOrganizationIdAndStatusIn(Long organizationId, List<com.MediUnivers.service.domain.UserStatus> statuses);

    long countByOrganizationIdAndPortalAndStatusIn(
            Long organizationId, Portal portal, List<com.MediUnivers.service.domain.UserStatus> statuses);

    List<AppUser> findByOrganizationIsNullOrderByFullNameAsc();

    boolean existsByRoleId(Long roleId);
}
