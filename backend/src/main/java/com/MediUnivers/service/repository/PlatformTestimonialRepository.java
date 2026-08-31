package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.PlatformTestimonial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlatformTestimonialRepository extends JpaRepository<PlatformTestimonial, Long> {
    List<PlatformTestimonial> findAllByOrderBySortOrderAsc();
    List<PlatformTestimonial> findByPublishedTrueOrderBySortOrderAsc();
}
