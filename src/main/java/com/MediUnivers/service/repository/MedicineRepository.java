package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MedicineRepository extends JpaRepository<Medicine, Long> {
    List<Medicine> findByOrganizationIdOrderByNameAsc(Long organizationId);

    @Query("select m from Medicine m where m.organization.id = :orgId "
            + "and (lower(m.name) like lower(concat('%', :term, '%')) or lower(m.code) like lower(concat('%', :term, '%'))) "
            + "order by m.name asc")
    List<Medicine> search(@Param("orgId") Long organizationId, @Param("term") String term);
}
