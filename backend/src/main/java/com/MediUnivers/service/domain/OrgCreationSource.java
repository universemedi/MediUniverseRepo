package com.MediUnivers.service.domain;

/** Where an organization came from — reporting only, never changes application behavior (spec §6). */
public enum OrgCreationSource {
    ONLINE_PURCHASE, FREE_TRIAL, DEMO_CONVERSION, DIRECT_SALES, SUPER_ADMIN
}
