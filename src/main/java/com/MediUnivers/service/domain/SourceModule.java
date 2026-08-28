package com.MediUnivers.service.domain;

/**
 * Which business module an invoice's charges came from. New modules extend
 * this enum and start calling BillingService — nothing else about the
 * billing engine needs to change for them to bill correctly.
 */
public enum SourceModule { CLINIC, PHARMACY, LAB, OTHER }
