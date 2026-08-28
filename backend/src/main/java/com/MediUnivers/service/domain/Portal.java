package com.MediUnivers.service.domain;

/** Which console a user signs into. Separate consoles, not roles within one console. */
public enum Portal {
    PLATFORM, // MediUnivers' own staff
    TENANT,   // a subscribed organization's own staff
    PATIENT   // a tenant's own patients
}
