package com.MediUnivers.service.domain;

/**
 * Account-security events MediUnivers itself must be able to email/SMS
 * regardless of whether the recipient's organization has configured its own
 * SMTP yet (a brand-new org hasn't, which is exactly why its owner's first
 * invite needs to go out through the platform's own sender, not the org's).
 */
public enum PlatformNotificationEventType {
    ORG_USER_INVITED,
    PLATFORM_STAFF_INVITED,
    PASSWORD_RESET_REQUESTED,
    /** Sent a few days before a trial or paid subscription's end date, trial and paid alike. */
    SUBSCRIPTION_EXPIRING_SOON,
    /** Sent the moment a subscription's end date passes with no renewal — trial or paid. */
    SUBSCRIPTION_EXPIRED,
    /** Sent when a payment successfully renews or upgrades an organization's subscription. */
    SUBSCRIPTION_RENEWED,
    /** Sent whenever a Super Admin manually changes an organization's status (suspend/cancel/reactivate). */
    ORGANIZATION_STATUS_CHANGED,
    /** Sent once an org owner actually activates their invited account — confirms onboarding completed, distinct from the invite link itself. */
    ORG_WELCOME,
    /** Sent to a lead/prospect when their enquiry reaches a customer-meaningful milestone (demo scheduled/completed, won). */
    LEAD_STATUS_UPDATED,
    /** Sent when platform staff share a coupon code with a lead or prospect. */
    COUPON_SHARED,
    /** Sent whenever a logged-in user successfully changes their own password — a security confirmation, not the reset-request link itself. */
    PASSWORD_CHANGED
}
