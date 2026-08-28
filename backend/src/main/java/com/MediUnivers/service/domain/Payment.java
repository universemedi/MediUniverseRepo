package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @Column(name = "payment_number", nullable = false, length = 30)
    private String paymentNumber;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMode mode;

    /** external reference — UPI transaction id, card auth code, cheque number, whatever applies */
    @Column(length = 100)
    private String reference;

    /** true when this payment is actually a refund (negative cashflow) rather than money received */
    @Column(name = "is_refund", nullable = false)
    private boolean refund = false;

    @Column(length = 200)
    private String note;

    /** set when this payment came through a gateway rather than being recorded manually */
    @Column(length = 30)
    private String gateway;

    @Column(name = "gateway_order_id", length = 100)
    private String gatewayOrderId;

    @Column(name = "gateway_payment_id", length = 100)
    private String gatewayPaymentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "received_by")
    private AppUser receivedBy;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt = Instant.now();
}
