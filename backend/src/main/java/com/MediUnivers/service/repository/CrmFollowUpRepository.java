package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.CrmFollowUp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CrmFollowUpRepository extends JpaRepository<CrmFollowUp, Long> {
    @Query("select f from CrmFollowUp f where f.lead.organization.id = :orgId order by f.dueDate asc")
    List<CrmFollowUp> findByOrganizationId(@Param("orgId") Long organizationId);
}
