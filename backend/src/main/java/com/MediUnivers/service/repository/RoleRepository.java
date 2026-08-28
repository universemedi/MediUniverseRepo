package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Portal;
import com.MediUnivers.service.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByCode(String code);

    List<Role> findByPortalAndOrganizationIsNull(Portal portal);

    List<Role> findByOrganizationId(Long organizationId);

    List<Role> findByPortalAndOrganizationId(Portal portal, Long organizationId);
}
