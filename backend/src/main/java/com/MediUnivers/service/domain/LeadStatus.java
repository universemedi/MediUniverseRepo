package com.MediUnivers.service.domain;

/** Standard CRM pipeline every public-website lead moves through (req #2). */
public enum LeadStatus {
    NEW_LEAD, CONTACTED, DEMO_SCHEDULED, DEMO_COMPLETED, WON, LOST
}
