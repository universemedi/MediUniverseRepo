package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.repository.OrganizationRepository;
import com.MediUnivers.service.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Date-driven subscription lifecycle for paid plans (trial expiry stays
 * {@link TrialExpiryService}'s job — trials auto-suspend immediately, no
 * grace period). Three daily passes, same cadence as the trial-expiry job:
 * remind a few days before expiry, move a lapsed paid subscription into
 * GRACE_PERIOD (temporary continued access, per {@code OrgStatus}'s own
 * documented meaning — previously a dead state nothing ever set), then
 * SUSPENDED once the grace window itself runs out with still no renewal.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionLifecycleService {

    private static final int REMINDER_DAYS_BEFORE = 3;
    private static final int GRACE_PERIOD_DAYS = 7;

    private final SubscriptionRepository subscriptionRepository;
    private final OrganizationRepository organizationRepository;
    private final PlatformNotificationService platformNotificationService;

    @Scheduled(cron = "${mediunivers.trial-expiry-cron}")
    @Transactional
    public void sendExpiringSoonReminders() {
        LocalDate today = LocalDate.now();
        List<Subscription> due = subscriptionRepository.findByStatusAndExpiryReminderSentFalseAndEndDateBetween(
                SubscriptionStatus.ACTIVE, today, today.plusDays(REMINDER_DAYS_BEFORE));
        for (Subscription sub : due) {
            Organization org = sub.getOrganization();
            long daysRemaining = ChronoUnit.DAYS.between(today, sub.getEndDate());
            log.info("Subscription expiring soon for organization {} ({}) — {} day(s) left.",
                    org.getOrganizationCode(), org.getName(), daysRemaining);

            Map<String, String> vars = new HashMap<>();
            vars.put("organizationName", org.getName());
            vars.put("planName", sub.getPlanNameSnapshot());
            vars.put("endDate", sub.getEndDate().format(DateTimeFormatter.ISO_DATE));
            vars.put("daysRemaining", String.valueOf(daysRemaining));
            platformNotificationService.notify(PlatformNotificationEventType.SUBSCRIPTION_EXPIRING_SOON,
                    recipientFor(org), vars, NotificationPriority.NORMAL, "ORGANIZATION", org.getId());

            sub.setExpiryReminderSent(true);
            subscriptionRepository.save(sub);
        }
    }

    @Scheduled(cron = "${mediunivers.trial-expiry-cron}")
    @Transactional
    public void lapsePaidSubscriptions() {
        LocalDate today = LocalDate.now();
        List<Subscription> overdue = subscriptionRepository.findByStatusAndFreeTrialFalseAndEndDateBefore(SubscriptionStatus.ACTIVE, today);
        for (Subscription sub : overdue) {
            Organization org = sub.getOrganization();
            if (org.getStatus() != OrgStatus.ACTIVE) continue; // already handled or in a manually-set state — don't override
            log.info("Paid subscription lapsed for organization {} ({}) — moving to GRACE_PERIOD.", org.getOrganizationCode(), org.getName());

            sub.setStatus(SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(sub);

            org.setStatus(OrgStatus.GRACE_PERIOD);
            organizationRepository.save(org);

            Map<String, String> vars = new HashMap<>();
            vars.put("organizationName", org.getName());
            vars.put("planName", sub.getPlanNameSnapshot());
            vars.put("endDate", sub.getEndDate().format(DateTimeFormatter.ISO_DATE));
            platformNotificationService.notify(PlatformNotificationEventType.SUBSCRIPTION_EXPIRED,
                    recipientFor(org), vars, NotificationPriority.HIGH, "ORGANIZATION", org.getId());
        }
    }

    @Scheduled(cron = "${mediunivers.trial-expiry-cron}")
    @Transactional
    public void suspendExhaustedGracePeriods() {
        LocalDate cutoff = LocalDate.now().minusDays(GRACE_PERIOD_DAYS);
        List<Organization> overdue = organizationRepository.findByStatusAndRenewsOnBefore(OrgStatus.GRACE_PERIOD, cutoff);
        for (Organization org : overdue) {
            log.info("Grace period exhausted for organization {} ({}) — moving to SUSPENDED.", org.getOrganizationCode(), org.getName());
            org.setStatus(OrgStatus.SUSPENDED);
            organizationRepository.save(org);

            Map<String, String> vars = new HashMap<>();
            vars.put("organizationName", org.getName());
            vars.put("newStatus", OrgStatus.SUSPENDED.name());
            platformNotificationService.notify(PlatformNotificationEventType.ORGANIZATION_STATUS_CHANGED,
                    recipientFor(org), vars, NotificationPriority.HIGH, "ORGANIZATION", org.getId());
        }
    }

    private NotificationRecipient recipientFor(Organization org) {
        return NotificationRecipient.of(org.getName(), org.getEmail(), org.getPhone());
    }
}
