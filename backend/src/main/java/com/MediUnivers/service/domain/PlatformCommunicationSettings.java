package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * One singleton row: MediUnivers' own outgoing email/SMS credentials, kept
 * entirely separate from any organization's {@link OrganizationCommunicationSettings}
 * — this is what sends account-security emails (invite, password reset) that
 * can't wait on a tenant configuring its own provider first.
 */
@Entity
@Table(name = "platform_communication_settings")
@Getter
@Setter
@NoArgsConstructor
public class PlatformCommunicationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email_enabled", nullable = false)
    private boolean emailEnabled = true;

    /** JSON: {"host","port","username","password","fromEmail","fromName","useTls"} */
    @Column(name = "email_config_json", length = 2000)
    private String emailConfigJson;

    @Column(name = "sms_enabled", nullable = false)
    private boolean smsEnabled = false;

    /** JSON: {"apiUrl","apiKey","senderId"} — blank apiUrl means "log only", same as the org-side Local Gateway. */
    @Column(name = "sms_config_json", length = 2000)
    private String smsConfigJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void touch() {
        this.updatedAt = Instant.now();
    }
}
