package com.MediUnivers.service.domain;

/** Which grid on MediUnivers' own public website a {@link PlatformContentCard} belongs to. */
public enum PlatformContentSection {
    FEATURE, // /features — one row per feature group, bullets_text holds its item list
    SOLUTION, // /solutions — tag holds the plan label, bullets_text holds the "wins" list
    VALUE, // /about — "our values" cards
    TEAM // /about — team/department cards
}
