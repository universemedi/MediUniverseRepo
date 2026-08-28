package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.OrgType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrgTypeRepository extends JpaRepository<OrgType, Long> {
    Optional<OrgType> findByCode(String code);
}
