package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmailIgnoreCase(String email);

    List<AppUser> findByOrganizationId(Long organizationId);

    boolean existsByEmailIgnoreCase(String email);

    Optional<AppUser> findByInviteToken(String inviteToken);

    Optional<AppUser> findByResetToken(String resetToken);

    long countByOrganizationIdAndStatusIn(Long organizationId, List<com.MediUnivers.service.domain.UserStatus> statuses);

    List<AppUser> findByOrganizationIsNullOrderByFullNameAsc();

    boolean existsByRoleId(Long roleId);
}
