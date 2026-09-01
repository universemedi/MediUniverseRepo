package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.PlatformNotification;
import com.MediUnivers.service.domain.NotificationStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface PlatformNotificationRepository extends JpaRepository<PlatformNotification, Long> {

    List<PlatformNotification> findByOrderByCreatedAtDesc(Pageable pageable);

    /** The header bell: this user's own in-app notifications. */
    List<PlatformNotification> findByRecipientUserIdAndChannelOrderByCreatedAtDesc(
            Long recipientUserId, NotificationChannel channel, Pageable pageable);

    long countByRecipientUserIdAndChannelAndReadFalse(Long recipientUserId, NotificationChannel channel);

    List<PlatformNotification> findTop100ByStatusInAndScheduledForIsNullOrderByCreatedAtAsc(List<NotificationStatus> statuses);

    List<PlatformNotification> findTop100ByStatusInAndScheduledForLessThanEqualOrderByCreatedAtAsc(
            List<NotificationStatus> statuses, Instant now);

    List<PlatformNotification> findTop100ByStatusAndNextRetryAtLessThanEqualOrderByCreatedAtAsc(NotificationStatus status, Instant now);
}
