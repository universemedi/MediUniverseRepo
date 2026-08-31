package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Communication & Notification Engine spec §7-8: one row per (event, channel)
 * an organization wants to send. Every org gets a default set seeded when the
 * organization is created (see OrganizationService/DataSeeder), and Org
 * Owner/Admin can then edit subject/body freely from the organization
 * dashboard — nothing here is hardcoded into Java (spec §7, business rule #2).
 *
 * Deliberately org-owned rather than a shared platform default: the brief
 * asks for templates to be "dynamically configurable from the organization
 * dashboard", so each org's copy is independently editable from day one
 * instead of inheriting a read-only platform template.
 */
@Entity
@Table(name = "notification_templates", uniqueConstraints = {
        @UniqueConstraint(name = "uq_notification_template_org_event_channel",
                columnNames = {"organization_id", "event_type", "channel"})
})
@Getter
@Setter
@NoArgsConstructor
public class NotificationTemplate {

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
    private NotificationChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationCategory category;

    @Column(nullable = false, length = 160)
    private String name;

    /** Not used for SMS/WhatsApp/IN_APP — those render the body only. */
    @Column(length = 200)
    private String subject;

    @Column(nullable = false, length = 4000)
    private String body;

    /** Comma-separated list of the {{placeholders}} this template supports, shown as a hint in the editor. */
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
