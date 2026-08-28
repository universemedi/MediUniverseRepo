package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    List<Doctor> findByOrganizationId(Long organizationId);
    Optional<Doctor> findByAppUserId(Long appUserId);
}
