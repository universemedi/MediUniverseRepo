package com.MediUnivers.service.domain;

/** Lifecycle of one Subscription row (Subscription Engine spec §7). */
public enum SubscriptionStatus {
    PENDING_PAYMENT, // public subscribe flow, org created but payment not yet confirmed
    ACTIVE,
    EXPIRED,         // ran past its end date (trial or paid) without renewal
    CANCELLED,
    SUPERSEDED       // replaced by a later subscription (e.g. a plan change)
}
