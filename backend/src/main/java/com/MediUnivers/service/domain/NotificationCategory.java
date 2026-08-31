package com.MediUnivers.service.domain;

/**
 * Groups event types for the "cannot be disabled" rule (spec §19) and for
 * filtering the notification log. Subscription-billing reminders are out of
 * scope for this pass (subscription flow isn't implemented yet).
 */
public enum NotificationCategory {
    AUTH,          // invites, password reset, OTP — never user-disable-able
    APPOINTMENT,
    BILLING,       // invoices, payments — never user-disable-able
    LAB,
    PHARMACY,
    CRM,
    WEBSITE,
    SUPPORT,
    GENERAL
}
