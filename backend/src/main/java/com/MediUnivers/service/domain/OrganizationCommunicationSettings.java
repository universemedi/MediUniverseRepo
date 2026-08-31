package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One row per organization: which channels the Communication Engine is
 * allowed to use for this org, and the provider credentials for each (spec
 * §24 "Providers are configurable"). Each channel's provider config is kept
 * as a small JSON blob — read/written as a whole by the settings screen and
 * never queried into — the same pattern OrganizationSettings uses for
 * businessHoursJson.
 */
@Entity
@Table(name = "organization_communication_settings")
@Getter
@Setter
@NoArgsConstructor
public class OrganizationCommunicationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", unique = true)
    private Organization organization;

    @Column(name = "email_enabled", nullable = false)
    private boolean emailEnabled = true;

    /** SMTP by default; provider name kept as a plain string so new ones (SES, SendGrid) don't need a migration. */
    @Column(name = "email_provider", nullable = false, length = 30)
    private String emailProvider = "SMTP";

    /** JSON: {"host","port","username","password","fromEmail","fromName","useTls"} */
    @Column(name = "email_config_json", length = 2000)
    private String emailConfigJson;

    @Column(name = "sms_enabled", nullable = false)
    private boolean smsEnabled = false;

    @Column(name = "sms_provider", nullable = false, length = 30)
    private String smsProvider = "LOCAL_GATEWAY";

    /** JSON: {"apiUrl","apiKey","apiSecret","senderId"} */
    @Column(name = "sms_config_json", length = 2000)
    private String smsConfigJson;

    @Column(name = "whatsapp_enabled", nullable = false)
    private boolean whatsappEnabled = false;

    @Column(name = "whatsapp_provider", nullable = false, length = 30)
    private String whatsappProvider = "WHATSAPP_CLOUD_API";

    /** JSON: {"apiUrl","apiKey","phoneNumberId"} */
    @Column(name = "whatsapp_config_json", length = 2000)
    private String whatsappConfigJson;

    @Column(name = "in_app_enabled", nullable = false)
    private boolean inAppEnabled = true;
}
