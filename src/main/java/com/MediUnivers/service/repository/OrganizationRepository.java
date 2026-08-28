package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {
    Optional<Organization> findBySubdomain(String subdomain);

    Optional<Organization> findBySlug(String slug);

    boolean existsBySlug(String slug);

    /** Atomic, gap-tolerant sequence — safe under concurrent organization creation. */
    @Query(value = "select nextval('organization_code_seq')", nativeQuery = true)
    long nextOrganizationCodeNumber();
}
