package com.MediUnivers.service.domain;

/**
 * Full tenant lifecycle (Organization Foundation spec §12). Login/access
 * rules per status live in AppUserPrincipal and AccessService, not here —
 * this enum just names the states.
 */
public enum OrgStatus {
    DRAFT,                 // creation started, incomplete — no login at all
    PENDING_VERIFICATION,  // awaiting email/identity verification — limited login
    TRIAL,                 // free trial, trial-enabled modules only
    ACTIVE,                // paid and current — normal access
    GRACE_PERIOD,          // subscription lapsed, temporary access continues
    SUSPENDED,             // blocked — owner can still log in to pay/resolve
    CANCELLED,             // customer cancelled — owner can still log in to view/export
    ARCHIVED                // retained for history only — no login
}
