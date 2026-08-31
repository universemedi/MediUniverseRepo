package com.MediUnivers.service.domain;

/** Delivery Status spec §13. */
public enum NotificationStatus {
    PENDING, QUEUED, PROCESSING, SENT, DELIVERED, FAILED, EXPIRED
}
