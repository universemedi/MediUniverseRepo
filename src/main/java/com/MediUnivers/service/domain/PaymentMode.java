package com.MediUnivers.service.domain;

/** ONLINE = collected through a payment gateway (Razorpay today, others later) rather than manually at the counter. */
public enum PaymentMode { CASH, UPI, CARD, BANK_TRANSFER, ONLINE }
