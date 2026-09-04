package com.MediUnivers.service.domain;

/**
 * Extras an organization can attach to its subscription on top of the base plan (spec-equivalent
 * of the "addon plans" requirement). SMS/WHATSAPP/PAYMENT_GATEWAY are simple on-off unlocks —
 * quantity is always 1. EXTRA_CLINIC/EXTRA_DOCTOR/EXTRA_STAFF/EXTRA_STORAGE are quantity-based —
 * each unit purchased raises the corresponding plan limit by whatever AddonPricing.unitLabel/size
 * represents, see AddonAccessService for how quantity translates into an effective limit.
 */
public enum AddonType {
    SMS, WHATSAPP, PAYMENT_GATEWAY, EXTRA_CLINIC, EXTRA_DOCTOR, EXTRA_STAFF, EXTRA_STORAGE
}
