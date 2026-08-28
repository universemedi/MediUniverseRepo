package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One row per organization (spec §14). businessHours is kept as a small JSON
 * blob rather than seven columns — it's read/written as a whole by the
 * settings screen and nothing else queries into it, so relational columns
 * would add ceremony without adding safety.
 */
@Entity
@Table(name = "organization_settings")
@Getter
@Setter
@NoArgsConstructor
public class OrganizationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", unique = true)
    private Organization organization;

    @Column(name = "date_format", nullable = false, length = 20)
    private String dateFormat = "DD-MM-YYYY";

    @Column(name = "time_format", nullable = false, length = 10)
    private String timeFormat = "12_HOUR";

    @Column(name = "appointment_slot_minutes", nullable = false)
    private int appointmentSlotMinutes = 15;

    @Column(name = "appointment_buffer_minutes", nullable = false)
    private int appointmentBufferMinutes = 5;

    @Column(name = "allow_overbooking", nullable = false)
    private boolean allowOverbooking = false;

    /** JSON: {"monday": {"enabled": true, "start": "09:00", "end": "18:00"}, ...} */
    @Column(name = "business_hours_json", length = 2000)
    private String businessHoursJson;

    @Column(name = "email_notifications_enabled", nullable = false)
    private boolean emailNotificationsEnabled = true;

    @Column(name = "sms_notifications_enabled", nullable = false)
    private boolean smsNotificationsEnabled = false;
}
