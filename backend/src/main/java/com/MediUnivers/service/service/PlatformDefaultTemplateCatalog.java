package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.PlatformNotificationEventType;

import java.util.ArrayList;
import java.util.List;

/** Starter wording for MediUnivers' own platform-origin emails — editable from the Super Admin's Platform Communication screen from the moment it's seeded. */
final class PlatformDefaultTemplateCatalog {

    private PlatformDefaultTemplateCatalog() {
    }

    record Default(PlatformNotificationEventType eventType, NotificationChannel channel, String name,
                    String subject, String body, String supportedVariables) {
    }

    /** Every event also gets an IN_APP row (header-bell copy — same body, no subject) for whichever ones actually carry a recipientUserId at notify() time; the rest just go unused. */
    static List<Default> all() {
        List<Default> emails = emailDefaults();
        List<Default> combined = new ArrayList<>(emails);
        for (Default d : emails) {
            combined.add(new Default(d.eventType(), NotificationChannel.IN_APP, d.name(), null, d.body(), d.supportedVariables()));
        }
        return combined;
    }

    private static List<Default> emailDefaults() {
        return List.of(
                new Default(PlatformNotificationEventType.ORG_USER_INVITED, NotificationChannel.EMAIL,
                        "Organization user invited",
                        "You're invited to join {{organizationName}} on MediUnivers",
                        "Hello {{fullName}},\n\nYou've been invited to join {{organizationName}} as {{roleName}}.\n"
                                + "Set up your account here: {{inviteLink}}\n\nThis link expires on {{expiresAt}}.\n\nThank you.",
                        "fullName,organizationName,roleName,inviteLink,expiresAt"),

                new Default(PlatformNotificationEventType.PLATFORM_STAFF_INVITED, NotificationChannel.EMAIL,
                        "Platform staff invited",
                        "You're invited to join the MediUnivers platform team",
                        "Hello {{fullName}},\n\nYou've been invited to join the MediUnivers platform team as {{roleName}}.\n"
                                + "Set up your account here: {{inviteLink}}\n\nThis link expires on {{expiresAt}}.\n\nThank you.",
                        "fullName,roleName,inviteLink,expiresAt"),

                new Default(PlatformNotificationEventType.PASSWORD_RESET_REQUESTED, NotificationChannel.EMAIL,
                        "Password reset requested",
                        "Reset your MediUnivers password",
                        "Hello {{fullName}},\n\nWe received a request to reset your password. Reset it here: {{resetLink}}\n\n"
                                + "This link expires on {{expiresAt}}. If you did not request this, you can safely ignore this email.\n\nThank you.",
                        "fullName,resetLink,expiresAt"),

                new Default(PlatformNotificationEventType.SUBSCRIPTION_EXPIRING_SOON, NotificationChannel.EMAIL,
                        "Subscription expiring soon",
                        "Your MediUnivers subscription for {{organizationName}} ends soon",
                        "Hello,\n\nYour {{planName}} subscription for {{organizationName}} ends on {{endDate}} "
                                + "({{daysRemaining}} day(s) from now). Renew from your Plans & Billing page to avoid any interruption.\n\nThank you.",
                        "organizationName,planName,endDate,daysRemaining"),

                new Default(PlatformNotificationEventType.SUBSCRIPTION_EXPIRED, NotificationChannel.EMAIL,
                        "Subscription expired",
                        "Your MediUnivers subscription for {{organizationName}} has ended",
                        "Hello,\n\nYour {{planName}} subscription for {{organizationName}} ended on {{endDate}}. "
                                + "Renew from your Plans & Billing page to restore full access.\n\nThank you.",
                        "organizationName,planName,endDate"),

                new Default(PlatformNotificationEventType.SUBSCRIPTION_RENEWED, NotificationChannel.EMAIL,
                        "Subscription renewed",
                        "Your MediUnivers subscription for {{organizationName}} is confirmed",
                        "Hello,\n\nYour {{planName}} subscription for {{organizationName}} is now active, renewing on {{renewsOn}}. "
                                + "Thank you for staying with MediUnivers.",
                        "organizationName,planName,renewsOn"),

                new Default(PlatformNotificationEventType.ORGANIZATION_STATUS_CHANGED, NotificationChannel.EMAIL,
                        "Organization status changed",
                        "Your MediUnivers organization status has changed",
                        "Hello,\n\nThe status of {{organizationName}} on MediUnivers has changed to {{newStatus}}. "
                                + "If you believe this is a mistake, please contact MediUnivers support.\n\nThank you.",
                        "organizationName,newStatus"),

                new Default(PlatformNotificationEventType.ORG_WELCOME, NotificationChannel.EMAIL,
                        "Organization welcome",
                        "Welcome to MediUnivers, {{organizationName}}!",
                        "Hello {{fullName}},\n\nYour MediUnivers account for {{organizationName}} is ready to go. "
                                + "Log in any time at {{loginLink}} to get started.\n\nThank you.",
                        "fullName,organizationName,loginLink"),

                new Default(PlatformNotificationEventType.LEAD_STATUS_UPDATED, NotificationChannel.EMAIL,
                        "Lead status updated",
                        "An update on your MediUnivers enquiry",
                        "Hello {{fullName}},\n\n{{statusMessage}}\n\nIf you have any questions, just reply to this email.\n\nThank you.",
                        "fullName,statusMessage"),

                new Default(PlatformNotificationEventType.COUPON_SHARED, NotificationChannel.EMAIL,
                        "Coupon shared",
                        "A discount code for MediUnivers, just for you",
                        "Hello {{fullName}},\n\nHere's a discount code for MediUnivers: {{couponCode}} ({{discountPercent}}% off), "
                                + "valid until {{validTo}}. Use it when you subscribe.\n\nThank you.",
                        "fullName,couponCode,discountPercent,validTo"),

                new Default(PlatformNotificationEventType.PASSWORD_CHANGED, NotificationChannel.EMAIL,
                        "Password changed",
                        "Your MediUnivers password was changed",
                        "Hello {{fullName}},\n\nYour MediUnivers password was just changed. If this was you, no action is needed. "
                                + "If you didn't make this change, please contact MediUnivers support immediately.\n\nThank you.",
                        "fullName")
        );
    }
}
