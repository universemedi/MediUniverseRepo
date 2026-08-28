package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BranchRepository extends JpaRepository<Branch, Long> {
    List<Branch> findByOrganizationId(Long organizationId);
}
