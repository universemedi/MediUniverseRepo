package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.CrmActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CrmActivityRepository extends JpaRepository<CrmActivity, Long> {
    @Query("select a from CrmActivity a where a.lead.organization.id = :orgId order by a.createdAt desc")
    List<CrmActivity> findByOrganizationId(@Param("orgId") Long organizationId);
}
