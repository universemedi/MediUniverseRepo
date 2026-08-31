package com.MediUnivers.service.service;

/** Who a notification goes to — whatever a business module has on hand for that person. */
public record NotificationRecipient(String name, String email, String phone, Long userId) {

    public static NotificationRecipient of(String name, String email, String phone) {
        return new NotificationRecipient(name, email, phone, null);
    }
}
