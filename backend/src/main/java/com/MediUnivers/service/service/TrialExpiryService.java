package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.NotificationPriority;
import com.MediUnivers.service.domain.OrgStatus;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.PlatformNotificationEventType;
import com.MediUnivers.service.domain.Subscription;
import com.MediUnivers.service.domain.SubscriptionStatus;
import com.MediUnivers.service.repository.OrganizationRepository;
import com.MediUnivers.service.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Auto-expires free trials past their end date (req #7). Runs on a
 * configurable cron schedule ({@code mediunivers.trial-expiry-cron}), same
 * plain-Spring {@code @Scheduled} idiom as {@link NotificationSchedulerService}
 * — the only scheduling precedent in this codebase, no Quartz needed for one
 * job. An expired trial moves the organization to SUSPENDED, which
 * AppUserPrincipal.isEnabled() already restricts to Owner-only login — the
 * exact "let them back in only to re-subscribe" behavior req #4 needs.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TrialExpiryService {

    private final SubscriptionRepository subscriptionRepository;
    private final OrganizationRepository organizationRepository;
    private final PlatformNotificationService platformNotificationService;

    @Scheduled(cron = "${mediunivers.trial-expiry-cron}")
    @Transactional
    public void expireOverdueTrials() {
        List<Subscription> overdue = subscriptionRepository
                .findByStatusAndFreeTrialTrueAndEndDateBefore(SubscriptionStatus.ACTIVE, LocalDate.now());
        for (Subscription sub : overdue) {
            Organization org = sub.getOrganization();
            log.info("Trial expired for organization {} ({}) — moving to SUSPENDED.", org.getOrganizationCode(), org.getName());

            sub.setStatus(SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(sub);

            org.setStatus(OrgStatus.SUSPENDED);
            organizationRepository.save(org);

            notifyOwner(org, sub);
        }
    }

    /** Routed through the platform's own Communication Engine, not the org's — a trial org almost never has its own SMTP configured yet. */
    private void notifyOwner(Organization org, Subscription sub) {
        Map<String, String> vars = new HashMap<>();
        vars.put("organizationName", org.getName());
        vars.put("planName", sub.getPlanNameSnapshot());
        vars.put("endDate", sub.getEndDate() != null ? sub.getEndDate().format(DateTimeFormatter.ISO_DATE) : "");
        platformNotificationService.notify(PlatformNotificationEventType.SUBSCRIPTION_EXPIRED,
                NotificationRecipient.of(org.getName(), org.getEmail(), org.getPhone()),
                vars, NotificationPriority.HIGH, "ORGANIZATION", org.getId());
    }
}
