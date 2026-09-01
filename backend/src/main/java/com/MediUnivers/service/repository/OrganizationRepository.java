package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.OrgStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {
    Optional<Organization> findBySubdomain(String subdomain);

    Optional<Organization> findBySlug(String slug);

    boolean existsBySlug(String slug);

    /** Orgs whose grace period (anchored on the lapsed subscription's end date, still held in renewsOn) has run out with no renewal. */
    List<Organization> findByStatusAndRenewsOnBefore(OrgStatus status, LocalDate date);

    /** Platform dashboard: total live customer count and the org-type breakdown. */
    List<Organization> findByStatusIn(List<OrgStatus> statuses);
    long countByStatusIn(List<OrgStatus> statuses);
    long countByStatusInAndCreatedAtBefore(List<OrgStatus> statuses, Instant before);

    /** Atomic, gap-tolerant sequence — safe under concurrent organization creation. */
    @Query(value = "select nextval('organization_code_seq')", nativeQuery = true)
    long nextOrganizationCodeNumber();
}
