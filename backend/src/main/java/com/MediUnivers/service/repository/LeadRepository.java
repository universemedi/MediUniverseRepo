package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Lead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeadRepository extends JpaRepository<Lead, Long> {
    List<Lead> findAllByOrderByCreatedAtDesc();
}
