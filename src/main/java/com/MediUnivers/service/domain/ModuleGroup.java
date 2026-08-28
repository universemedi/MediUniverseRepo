package com.MediUnivers.service.domain;

/**
 * A business module bucket. Mirrors the frontend's ModuleGroup
 * (src/lib/rbac.ts) so both sides agree on the same vocabulary.
 */
public enum ModuleGroup {
    PLATFORM, // MediUnivers product-owner console only
    ORG,      // organization settings, users, roles, subscription
    BILLING,  // centralized billing engine — every org has it, not plan/org-type gated
    CLINIC,
    PHARMACY,
    LAB,
    CRM,
    CMS,
    PATIENT
}
