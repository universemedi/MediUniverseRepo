package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.FamilyMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {
    List<FamilyMember> findByPatientId(Long patientId);
}
