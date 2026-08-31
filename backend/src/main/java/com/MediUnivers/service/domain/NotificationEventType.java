package com.MediUnivers.service.domain;

/**
 * Every business event the platform can notify about (spec §21, organization
 * scope only — subscription-lifecycle events are intentionally excluded
 * since that flow isn't implemented yet). Adding a new event here still
 * requires a code change at the call site that raises it, but the
 * *message itself* never does — that's owned entirely by the org's editable
 * {@link NotificationTemplate} rows (spec §7, "no hardcoded messages").
 */
public enum NotificationEventType {
    USER_INVITED(NotificationCategory.AUTH),
    PASSWORD_RESET_REQUESTED(NotificationCategory.AUTH),
    TRIAL_EXPIRED(NotificationCategory.AUTH),
    APPOINTMENT_BOOKED(NotificationCategory.APPOINTMENT),
    APPOINTMENT_CANCELLED(NotificationCategory.APPOINTMENT),
    APPOINTMENT_REMINDER(NotificationCategory.APPOINTMENT),
    INVOICE_GENERATED(NotificationCategory.BILLING),
    PAYMENT_RECEIVED(NotificationCategory.BILLING),
    LAB_REPORT_READY(NotificationCategory.LAB),
    WEBSITE_CONTACT_RECEIVED(NotificationCategory.WEBSITE);

    private final NotificationCategory category;

    NotificationEventType(NotificationCategory category) {
        this.category = category;
    }

    public NotificationCategory category() {
        return category;
    }

    /** Billing/auth events carry money or account-access consequences — never user-disable-able (spec §19). */
    public boolean isCritical() {
        return category == NotificationCategory.BILLING || category == NotificationCategory.AUTH;
    }
}
