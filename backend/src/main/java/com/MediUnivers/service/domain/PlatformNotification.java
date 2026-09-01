package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Queue + log for platform-origin notifications — the {@link Notification} equivalent minus an owning organization. */
@Entity
@Table(name = "platform_notifications", indexes = {
        @Index(name = "idx_platform_notifications_status_scheduled", columnList = "status, scheduled_for"),
        @Index(name = "idx_platform_notifications_created", columnList = "created_at"),
})
@Getter
@Setter
@NoArgsConstructor
public class PlatformNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 40)
    private PlatformNotificationEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationPriority priority = NotificationPriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationStatus status = NotificationStatus.PENDING;

    @Column(name = "recipient_name", length = 160)
    private String recipientName;

    @Column(name = "recipient_email", length = 180)
    private String recipientEmail;

    @Column(name = "recipient_phone", length = 30)
    private String recipientPhone;

    @Column(name = "recipient_user_id")
    private Long recipientUserId;

    @Column(length = 200)
    private String subject;

    @Column(nullable = false, length = 4000)
    private String body;

    @Column(name = "reference_type", length = 40)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "scheduled_for")
    private Instant scheduledFor;

    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    @Column(name = "max_retries", nullable = false)
    private int maxRetries = 3;

    @Column(name = "next_retry_at")
    private Instant nextRetryAt;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "sent_at")
    private Instant sentAt;

    /** Whether the recipient has seen this in their header notification bell — independent of delivery `status`. */
    @Column(name = "is_read", nullable = false)
    private boolean read = false;
}
