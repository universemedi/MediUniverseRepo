package com.MediUnivers.service.domain;

/** Tracks whether a completed consultation's prescription has been picked up by the pharmacy yet. */
public enum PharmacyQueueStatus { NONE, PENDING, PARTIALLY_DISPENSED, DISPENSED }
