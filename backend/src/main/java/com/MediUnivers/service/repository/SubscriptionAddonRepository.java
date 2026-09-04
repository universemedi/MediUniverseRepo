package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.SubscriptionAddon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubscriptionAddonRepository extends JpaRepository<SubscriptionAddon, Long> {
    List<SubscriptionAddon> findBySubscriptionId(Long subscriptionId);
}
