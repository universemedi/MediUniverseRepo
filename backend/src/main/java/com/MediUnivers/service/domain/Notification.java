package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * The queue AND the log, in one row (spec §6/§14/§20/§28 collapse cleanly
 * onto a relational table: a "queue" is just PENDING/QUEUED rows, a "log" is
 * every row regardless of status — no need for separate Mongo-style
 * notification_queue/notification_logs/email_logs/sms_logs collections once
 * this is a proper indexed SQL table).
 */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notifications_org_created", columnList = "organization_id, created_at"),
        @Index(name = "idx_notifications_status_scheduled", columnList = "status, scheduled_for"),
})
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 40)
    private NotificationEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationCategory category;

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

    /** Set when the recipient is a platform user (staff/patient login) rather than an external contact. */
    @Column(name = "recipient_user_id")
    private Long recipientUserId;

    @Column(length = 200)
    private String subject;

    @Column(nullable = false, length = 4000)
    private String body;

    /** e.g. "APPOINTMENT" + the appointment id — traces back to the record that triggered this, without an FK. */
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

    public boolean isDue() {
        return scheduledFor == null || !scheduledFor.isAfter(Instant.now());
    }
}
