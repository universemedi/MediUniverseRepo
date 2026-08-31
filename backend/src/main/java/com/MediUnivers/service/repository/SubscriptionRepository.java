package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Subscription;
import com.MediUnivers.service.domain.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    List<Subscription> findAllByOrderByStartDateDesc();

    List<Subscription> findByOrganizationIdOrderByStartDateDesc(Long organizationId);

    Optional<Subscription> findFirstByOrganizationIdAndStatusOrderByStartDateDesc(Long organizationId, SubscriptionStatus status);

    List<Subscription> findByStatusAndFreeTrialTrueAndEndDateBefore(SubscriptionStatus status, LocalDate date);

    List<Subscription> findByStatusAndFreeTrialTrue(SubscriptionStatus status);

    boolean existsByPlanIdAndStatus(Long planId, SubscriptionStatus status);
}
