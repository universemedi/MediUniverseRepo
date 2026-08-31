package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    List<Patient> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    Optional<Patient> findByOrganizationIdAndPhone(Long organizationId, String phone);

    Optional<Patient> findByOrganizationIdAndEmailIgnoreCase(Long organizationId, String email);

    @Query("select p from Patient p where p.organization.id = :orgId and ("
            + "lower(p.firstName) like lower(concat('%', :term, '%')) "
            + "or lower(p.lastName) like lower(concat('%', :term, '%')) "
            + "or p.phone like concat('%', :term, '%') "
            + "or lower(p.patientNumber) like lower(concat('%', :term, '%'))) "
            + "order by p.createdAt desc")
    List<Patient> search(@Param("orgId") Long organizationId, @Param("term") String term);
}
