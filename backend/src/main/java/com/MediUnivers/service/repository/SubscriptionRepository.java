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

    /** Reminder window: due but not sent yet, trial or paid alike. */
    List<Subscription> findByStatusAndExpiryReminderSentFalseAndEndDateBetween(SubscriptionStatus status, LocalDate from, LocalDate to);

    /** Paid subscriptions whose period has lapsed with no renewal — trials are handled separately (auto-suspend, no grace period). */
    List<Subscription> findByStatusAndFreeTrialFalseAndEndDateBefore(SubscriptionStatus status, LocalDate date);
}
