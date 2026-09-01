package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Editable-by-Super-Admin wording for a platform-origin event, one row per (event, channel) — no organization owner, unlike {@link NotificationTemplate}. */
@Entity
@Table(name = "platform_notification_templates", uniqueConstraints = {
        @UniqueConstraint(name = "uq_platform_notification_template_event_channel",
                columnNames = {"event_type", "channel"})
})
@Getter
@Setter
@NoArgsConstructor
public class PlatformNotificationTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 40)
    private PlatformNotificationEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationChannel channel;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 200)
    private String subject;

    @Column(nullable = false, length = 4000)
    private String body;

    @Column(name = "supported_variables", length = 500)
    private String supportedVariables;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void touch() {
        this.updatedAt = Instant.now();
    }
}
