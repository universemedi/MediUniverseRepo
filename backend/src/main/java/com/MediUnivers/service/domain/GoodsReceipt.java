package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** GRN — Goods Receipt Note. Receiving stock (against a PO, or directly) is what creates Batches. */
@Entity
@Table(name = "goods_receipts")
@Getter
@Setter
@NoArgsConstructor
public class GoodsReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id")
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Column(name = "grn_number", nullable = false, length = 30)
    private String grnNumber;

    @Column(name = "supplier_invoice_number", length = 60)
    private String supplierInvoiceNumber;

    @Column(name = "supplier_invoice_date")
    private java.time.LocalDate supplierInvoiceDate;

    @OneToMany(mappedBy = "goodsReceipt", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<GoodsReceiptItem> items = new ArrayList<>();

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt = Instant.now();

    public void addItem(GoodsReceiptItem item) {
        item.setGoodsReceipt(this);
        this.items.add(item);
    }
}
