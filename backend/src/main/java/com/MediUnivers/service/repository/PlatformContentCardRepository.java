package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.PlatformContentCard;
import com.MediUnivers.service.domain.PlatformContentSection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlatformContentCardRepository extends JpaRepository<PlatformContentCard, Long> {
    List<PlatformContentCard> findBySectionOrderBySortOrderAsc(PlatformContentSection section);
    List<PlatformContentCard> findBySectionAndPublishedTrueOrderBySortOrderAsc(PlatformContentSection section);
}
