package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.TaxRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaxRuleRepository extends JpaRepository<TaxRule, Long> {
    List<TaxRule> findByOrganizationIsNull();
    List<TaxRule> findByOrganizationId(Long organizationId);
}
