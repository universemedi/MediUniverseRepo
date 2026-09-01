package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Notification;
import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.NotificationStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId, Pageable pageable);

    List<Notification> findByOrganizationIdAndStatusOrderByCreatedAtDesc(
            Long organizationId, NotificationStatus status, Pageable pageable);

    List<Notification> findByOrganizationIdAndChannelOrderByCreatedAtDesc(
            Long organizationId, NotificationChannel channel, Pageable pageable);

    // Priority is resolved in Java (NotificationSchedulerService), not in SQL — sorting an
    // EnumType.STRING column would order alphabetically ("CRITICAL" < "HIGH" < "LOW" < "NORMAL"),
    // not by actual severity, so these just return a due batch by age and let the caller rank it.

    /** Immediate sends: never scheduled, still pending/queued. */
    List<Notification> findTop100ByStatusInAndScheduledForIsNullOrderByCreatedAtAsc(List<NotificationStatus> statuses);

    /** Scheduled sends (reminders) whose time has arrived. */
    List<Notification> findTop100ByStatusInAndScheduledForLessThanEqualOrderByCreatedAtAsc(
            List<NotificationStatus> statuses, Instant now);

    /** Failed deliveries whose retry backoff has elapsed. */
    List<Notification> findTop100ByStatusAndNextRetryAtLessThanEqualOrderByCreatedAtAsc(NotificationStatus status, Instant now);

    long countByOrganizationIdAndStatus(Long organizationId, NotificationStatus status);

    /** The header bell: this user's own in-app notifications. */
    List<Notification> findByRecipientUserIdAndChannelOrderByCreatedAtDesc(
            Long recipientUserId, NotificationChannel channel, Pageable pageable);

    long countByRecipientUserIdAndChannelAndReadFalse(Long recipientUserId, NotificationChannel channel);
}
