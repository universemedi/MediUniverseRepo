package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.SampleCollection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SampleCollectionRepository extends JpaRepository<SampleCollection, Long> {
    Optional<SampleCollection> findByOrderId(Long orderId);
    List<SampleCollection> findByOrderIdIn(List<Long> orderIds);
    List<SampleCollection> findByOrderIdOrderByCollectedAtDesc(Long orderId);
}
