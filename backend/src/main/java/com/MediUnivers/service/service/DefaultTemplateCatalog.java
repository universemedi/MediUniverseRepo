package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.NotificationEventType;

import java.util.List;

/**
 * The starter set of templates every organization gets the moment it's
 * created (spec §7-10 examples). Nothing here is ever sent as-is without
 * going through {@link TemplateRenderService} first, and every row is a
 * normal, editable {@code notification_templates} row from the moment it's
 * seeded — an org can rewrite, retitle or deactivate any of these from its
 * dashboard. This class only supplies sensible starting content.
 */
final class DefaultTemplateCatalog {

    private DefaultTemplateCatalog() {
    }

    record Default(NotificationEventType eventType, NotificationChannel channel, String name,
                    String subject, String body, String supportedVariables) {
    }

    static List<Default> all() {
        return List.of(
                new Default(NotificationEventType.USER_INVITED, NotificationChannel.EMAIL,
                        "Staff invitation",
                        "You're invited to join {{organizationName}} on MediUnivers",
                        "Hello {{fullName}},\n\nYou've been invited to join {{organizationName}} as a {{roleName}}.\n"
                                + "Set up your account here: {{inviteLink}}\n\nThis link expires on {{expiresAt}}.\n\nThank you.",
                        "fullName,organizationName,roleName,inviteLink,expiresAt"),

                new Default(NotificationEventType.PASSWORD_RESET_REQUESTED, NotificationChannel.EMAIL,
                        "Password reset requested",
                        "Reset your MediUnivers password",
                        "Hello {{fullName}},\n\nWe received a request to reset your password. Reset it here: {{resetLink}}\n\n"
                                + "This link expires on {{expiresAt}}. If you did not request this, you can safely ignore this email.\n\nThank you.",
                        "fullName,resetLink,expiresAt"),

                new Default(NotificationEventType.TRIAL_EXPIRED, NotificationChannel.EMAIL,
                        "Free trial expired",
                        "Your MediUnivers trial has ended",
                        "Hello {{fullName}},\n\nYour {{freeTrialDays}}-day free trial for {{organizationName}} has ended. "
                                + "Sign in and pick a plan to keep using MediUnivers: {{plansLink}}\n\nThank you.",
                        "fullName,organizationName,freeTrialDays,plansLink"),

                new Default(NotificationEventType.APPOINTMENT_BOOKED, NotificationChannel.EMAIL,
                        "Appointment confirmation (email)",
                        "Appointment Confirmation",
                        "Hello {{patientName}},\n\nYour appointment with Dr. {{doctorName}} is confirmed for "
                                + "{{appointmentDate}} {{appointmentTime}} at {{organizationName}}.\n\nThank you.",
                        "patientName,doctorName,organizationName,appointmentDate,appointmentTime"),
                new Default(NotificationEventType.APPOINTMENT_BOOKED, NotificationChannel.SMS,
                        "Appointment confirmation (SMS)",
                        null,
                        "Dear {{patientName}}, your appointment is confirmed. {{appointmentDate}} {{appointmentTime}} -{{organizationName}}",
                        "patientName,organizationName,appointmentDate,appointmentTime"),

                new Default(NotificationEventType.APPOINTMENT_CANCELLED, NotificationChannel.EMAIL,
                        "Appointment cancelled (email)",
                        "Your appointment has been cancelled",
                        "Hello {{patientName}},\n\nYour appointment with Dr. {{doctorName}} on {{appointmentDate}} "
                                + "{{appointmentTime}} has been cancelled. Please contact us to reschedule.\n\n{{organizationName}}",
                        "patientName,doctorName,organizationName,appointmentDate,appointmentTime"),
                new Default(NotificationEventType.APPOINTMENT_CANCELLED, NotificationChannel.SMS,
                        "Appointment cancelled (SMS)",
                        null,
                        "Dear {{patientName}}, your appointment on {{appointmentDate}} {{appointmentTime}} has been cancelled. -{{organizationName}}",
                        "patientName,organizationName,appointmentDate,appointmentTime"),

                new Default(NotificationEventType.APPOINTMENT_REMINDER, NotificationChannel.EMAIL,
                        "Appointment reminder (email)",
                        "Reminder: upcoming appointment",
                        "Hello {{patientName}},\n\nThis is a reminder for your appointment with Dr. {{doctorName}} on "
                                + "{{appointmentDate}} {{appointmentTime}} at {{organizationName}}.\n\nSee you soon.",
                        "patientName,doctorName,organizationName,appointmentDate,appointmentTime"),
                new Default(NotificationEventType.APPOINTMENT_REMINDER, NotificationChannel.SMS,
                        "Appointment reminder (SMS)",
                        null,
                        "Reminder: your appointment is on {{appointmentDate}} {{appointmentTime}}. -{{organizationName}}",
                        "patientName,organizationName,appointmentDate,appointmentTime"),

                new Default(NotificationEventType.INVOICE_GENERATED, NotificationChannel.EMAIL,
                        "Invoice generated (email)",
                        "Invoice {{invoiceNumber}} from {{organizationName}}",
                        "Hello {{patientName}},\n\nInvoice {{invoiceNumber}} for {{amount}} has been generated.\n\nThank you, {{organizationName}}",
                        "patientName,organizationName,invoiceNumber,amount"),
                new Default(NotificationEventType.INVOICE_GENERATED, NotificationChannel.SMS,
                        "Invoice generated (SMS)",
                        null,
                        "Invoice {{invoiceNumber}} for {{amount}} generated. -{{organizationName}}",
                        "organizationName,invoiceNumber,amount"),
                new Default(NotificationEventType.INVOICE_GENERATED, NotificationChannel.IN_APP,
                        "Invoice generated (in-app)",
                        null,
                        "Invoice {{invoiceNumber}} generated for {{patientName}} — {{amount}}.",
                        "patientName,invoiceNumber,amount"),

                new Default(NotificationEventType.PAYMENT_RECEIVED, NotificationChannel.EMAIL,
                        "Payment received (email)",
                        "Payment received — {{organizationName}}",
                        "Hello {{patientName}},\n\nWe've received your payment of {{amount}} against invoice "
                                + "{{invoiceNumber}}.\n\nThank you, {{organizationName}}",
                        "patientName,organizationName,invoiceNumber,amount"),
                new Default(NotificationEventType.PAYMENT_RECEIVED, NotificationChannel.SMS,
                        "Payment received (SMS)",
                        null,
                        "Payment of {{amount}} received for invoice {{invoiceNumber}}. -{{organizationName}}",
                        "organizationName,invoiceNumber,amount"),
                new Default(NotificationEventType.PAYMENT_RECEIVED, NotificationChannel.IN_APP,
                        "Payment received (in-app)",
                        null,
                        "Payment of {{amount}} received against invoice {{invoiceNumber}}.",
                        "invoiceNumber,amount"),

                new Default(NotificationEventType.LAB_REPORT_READY, NotificationChannel.EMAIL,
                        "Lab report ready (email)",
                        "Your lab report is ready",
                        "Hello {{patientName}},\n\nYour lab report (order {{orderNumber}}) is ready. Please "
                                + "visit {{organizationName}} or log in to download it.\n\nThank you.",
                        "patientName,organizationName,orderNumber"),
                new Default(NotificationEventType.LAB_REPORT_READY, NotificationChannel.SMS,
                        "Lab report ready (SMS)",
                        null,
                        "Dear {{patientName}}, your lab report ({{orderNumber}}) is ready. -{{organizationName}}",
                        "patientName,organizationName,orderNumber"),
                new Default(NotificationEventType.LAB_REPORT_READY, NotificationChannel.IN_APP,
                        "Lab report ready (in-app)",
                        null,
                        "Lab report ready for {{patientName}} — order {{orderNumber}}.",
                        "patientName,orderNumber"),

                new Default(NotificationEventType.WEBSITE_CONTACT_RECEIVED, NotificationChannel.EMAIL,
                        "New website enquiry (email)",
                        "New enquiry from your website",
                        "You've received a new enquiry from {{visitorName}} ({{visitorEmail}}, {{visitorPhone}}):\n\n{{message}}",
                        "visitorName,visitorEmail,visitorPhone,message"),
                new Default(NotificationEventType.WEBSITE_CONTACT_RECEIVED, NotificationChannel.IN_APP,
                        "New website enquiry (in-app)",
                        null,
                        "New website enquiry from {{visitorName}}.",
                        "visitorName")
        );
    }
}
