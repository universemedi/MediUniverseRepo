package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.Notification;
import com.MediUnivers.service.domain.NotificationStatus;
import com.MediUnivers.service.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * The Queue → Worker half of the Communication Engine (spec §14-18).
 * NotificationService only ever writes rows; this is what actually turns
 * PENDING rows into SENT/FAILED ones, on its own clock, so nothing a
 * business module does ever waits on a network call to an email/SMS/WhatsApp
 * provider.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationSchedulerService {

    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final PlatformNotificationService platformNotificationService;

    private static final List<NotificationStatus> DISPATCHABLE = List.of(NotificationStatus.PENDING, NotificationStatus.QUEUED);

    /** Immediate sends + scheduled reminders whose time has arrived. Runs every 15s. */
    @Scheduled(fixedDelay = 15_000)
    public void processQueue() {
        Instant now = Instant.now();
        notificationRepository.findTop100ByStatusInAndScheduledForIsNullOrderByCreatedAtAsc(DISPATCHABLE)
                .forEach(n -> notificationService.dispatch(n.getId()));
        notificationRepository.findTop100ByStatusInAndScheduledForLessThanEqualOrderByCreatedAtAsc(DISPATCHABLE, now)
                .forEach(n -> notificationService.dispatch(n.getId()));
        platformNotificationService.dueImmediate(DISPATCHABLE)
                .forEach(n -> platformNotificationService.dispatch(n.getId()));
    }

    /** Retry Strategy (spec §15): failed deliveries whose backoff has elapsed get one more attempt. Runs every minute. */
    @Scheduled(fixedDelay = 60_000)
    public void processRetries() {
        notificationRepository.findTop100ByStatusAndNextRetryAtLessThanEqualOrderByCreatedAtAsc(NotificationStatus.FAILED, Instant.now())
                .forEach(n -> {
                    notificationService.requeueForRetry(n);
                    notificationService.dispatch(n.getId());
                });
        platformNotificationService.dueRetries(Instant.now())
                .forEach(n -> {
                    platformNotificationService.requeueForRetry(n);
                    platformNotificationService.dispatch(n.getId());
                });
    }

    /** Safety net: a scheduled reminder that somehow sat un-dispatched for over a day is stale, not useful — expire it instead of sending it late. */
    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void expireStaleScheduled() {
        Instant cutoff = Instant.now().minus(1, ChronoUnit.DAYS);
        List<Notification> stale = notificationRepository
                .findTop100ByStatusInAndScheduledForLessThanEqualOrderByCreatedAtAsc(DISPATCHABLE, cutoff);
        for (Notification n : stale) {
            if (n.getScheduledFor() == null || n.getScheduledFor().isAfter(cutoff)) continue;
            n.setStatus(NotificationStatus.EXPIRED);
            notificationRepository.save(n);
        }
    }
}
