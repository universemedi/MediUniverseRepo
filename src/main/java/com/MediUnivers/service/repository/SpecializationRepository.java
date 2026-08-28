package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Specialization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpecializationRepository extends JpaRepository<Specialization, Long> {
    List<Specialization> findByOrganizationIsNull();
    List<Specialization> findByOrganizationId(Long organizationId);
}
