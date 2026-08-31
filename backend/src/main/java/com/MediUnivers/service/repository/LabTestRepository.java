package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.LabTest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LabTestRepository extends JpaRepository<LabTest, Long> {
    List<LabTest> findByOrganizationIdOrderByNameAsc(Long organizationId);
    long countByOrganizationId(Long organizationId);

    @Query("select t from LabTest t where t.organization.id = :orgId "
            + "and (lower(t.name) like lower(concat('%', :term, '%')) or lower(t.code) like lower(concat('%', :term, '%'))) "
            + "order by t.name asc")
    List<LabTest> search(@Param("orgId") Long organizationId, @Param("term") String term);
}
