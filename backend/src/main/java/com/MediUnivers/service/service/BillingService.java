package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.payment.GatewayOrderResult;
import com.MediUnivers.service.payment.PaymentGatewayService;
import com.MediUnivers.service.repository.InvoiceRepository;
import com.MediUnivers.service.security.CurrentUserService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The centralized Billing Engine. Every business module bills through this
 * one service instead of building its own invoicing — per spec, "Pharmacy
 * never creates invoices directly... one billing system for the platform,"
 * and the same principle applies to Clinic, Laboratory, and any module that
 * comes after them.
 *
 * TO ADD BILLING TO A NEW MODULE:
 *   1. Add a value to {@link SourceModule} for it (or reuse OTHER for something minor).
 *   2. Call {@link #createInvoice} with a list of {@link InvoiceLineItemInput} describing
 *      what's being charged — sourceType/sourceId let the line trace back to whatever
 *      record created it, without this engine needing a foreign key into that module's
 *      tables.
 *   3. Optionally call {@link #recordPayment} immediately if the module collects payment
 *      inline (like Pharmacy's counter sales); otherwise leave the invoice UNPAID and let
 *      reception collect payment later through the Billing screens, manually or via
 *      {@link #createGatewayOrder} / {@link #confirmGatewayPayment} for online payment.
 * Nothing else in this class needs to change for a new module to bill correctly.
 *
 * TO ADD A NEW PAYMENT GATEWAY: implement {@link PaymentGatewayService} and register it
 * as a Spring bean — Spring collects every implementation into the gateways map below,
 * keyed by bean name, so createGatewayOrder/confirmGatewayPayment can select it by that
 * name without any change here.
 */
@Service
@Transactional
public class BillingService {

    private final InvoiceRepository invoiceRepository;
    private final NumberSeriesService numberSeriesService;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final Map<String, PaymentGatewayService> gateways;
    private final AddonAccessService addonAccessService;
    private static final String DEFAULT_GATEWAY = "razorpay";

    public BillingService(InvoiceRepository invoiceRepository, NumberSeriesService numberSeriesService,
                           CurrentUserService currentUserService, NotificationService notificationService,
                           List<PaymentGatewayService> gatewayBeans, AddonAccessService addonAccessService) {
        this.invoiceRepository = invoiceRepository;
        this.numberSeriesService = numberSeriesService;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.addonAccessService = addonAccessService;
        // Keyed by each gateway's own gatewayName() — not the Spring bean name — so the
        // API surface (and any request body) can use a short, stable identifier like
        // "razorpay" regardless of how the implementation class happens to be named.
        this.gateways = gatewayBeans.stream()
                .collect(java.util.stream.Collectors.toMap(PaymentGatewayService::gatewayName, g -> g));
    }

    public Invoice createInvoice(Organization organization, Branch branch, Patient patient,
                                  SourceModule sourceModule, List<InvoiceLineItemInput> items) {
        if (items == null || items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An invoice needs at least one line item.");
        }
        Invoice invoice = new Invoice();
        invoice.setOrganization(organization);
        invoice.setBranch(branch);
        invoice.setPatient(patient);
        invoice.setSourceModule(sourceModule);
        invoice.setInvoiceNumber(numberSeriesService.next(organization, "INVOICE", "INV", ResetPolicy.YEARLY, 6));

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal discountTotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;

        for (InvoiceLineItemInput in : items) {
            BigDecimal qty = BigDecimal.valueOf(in.quantity());
            BigDecimal lineSubtotal = in.unitPrice().multiply(qty);
            BigDecimal lineDiscount = (in.discount() != null ? in.discount() : BigDecimal.ZERO).multiply(qty);
            BigDecimal taxable = lineSubtotal.subtract(lineDiscount);
            BigDecimal taxPercent = in.taxPercent() != null ? in.taxPercent() : BigDecimal.ZERO;
            BigDecimal lineTax = taxable.multiply(taxPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = taxable.add(lineTax);

            InvoiceLineItem item = new InvoiceLineItem();
            item.setDescription(in.description());
            item.setSourceType(in.sourceType());
            item.setSourceId(in.sourceId());
            item.setQuantity(in.quantity());
            item.setUnitPrice(in.unitPrice());
            item.setDiscount(lineDiscount);
            item.setTaxPercent(taxPercent);
            item.setLineTotal(lineTotal);
            invoice.addLineItem(item);

            subtotal = subtotal.add(lineSubtotal);
            discountTotal = discountTotal.add(lineDiscount);
            taxTotal = taxTotal.add(lineTax);
        }

        invoice.setSubtotal(subtotal);
        invoice.setDiscountTotal(discountTotal);
        invoice.setTaxTotal(taxTotal);
        invoice.setGrandTotal(subtotal.subtract(discountTotal).add(taxTotal));
        invoice.setStatus(InvoiceStatus.UNPAID);
        invoice = invoiceRepository.save(invoice);
        notifyInvoiceGenerated(organization, invoice);
        return invoice;
    }

    /** Called by a source module when the thing that generated an invoice gets voided (e.g. a cancelled lab order) —
     * only safe for an invoice nothing has been paid against yet; anything already paid needs a refund, not a cancel. */
    public void cancelInvoice(Organization organization, Long invoiceId) {
        Invoice invoice = requireOwned(organization, invoiceId);
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) return;
        if (invoice.getAmountPaid().signum() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This invoice already has a payment recorded against it — refund it instead of cancelling.");
        }
        invoice.setStatus(InvoiceStatus.CANCELLED);
    }

    /** Called by a source module (e.g. Pharmacy returns) to credit part of an invoice back — reduces
     * the grand total by the returned amount, and if that pushes what's been paid above the new
     * total, records a refund payment for the difference (money actually owed back to the patient). */
    public Invoice applyReturnCredit(Organization organization, Long invoiceId, BigDecimal amount,
                                      PaymentMode refundMode, String note) {
        if (amount.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Credit amount must be greater than zero.");
        }
        Invoice invoice = requireOwned(organization, invoiceId);
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This invoice has been cancelled.");
        }
        if (amount.compareTo(invoice.getGrandTotal()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That's more than the invoice's total.");
        }
        invoice.setGrandTotal(invoice.getGrandTotal().subtract(amount));

        BigDecimal excess = invoice.getAmountPaid().subtract(invoice.getGrandTotal());
        if (excess.signum() > 0) {
            Payment refund = new Payment();
            refund.setPaymentNumber(numberSeriesService.next(organization, "PAYMENT", "PAY", ResetPolicy.YEARLY, 6));
            refund.setAmount(excess);
            refund.setMode(refundMode);
            refund.setNote(note);
            refund.setRefund(true);
            refund.setReceivedBy(currentUserService.require());
            refund.setReceivedAt(Instant.now());
            invoice.addPayment(refund);
            invoice.setAmountPaid(invoice.getAmountPaid().subtract(excess));
        }

        BigDecimal balance = invoice.balanceDue();
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            invoice.setStatus(InvoiceStatus.PAID);
        } else if (invoice.getAmountPaid().signum() > 0) {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        } else {
            invoice.setStatus(InvoiceStatus.UNPAID);
        }
        return invoiceRepository.save(invoice);
    }

    public Invoice recordPayment(Organization organization, Long invoiceId, RecordPaymentRequest request) {
        Invoice invoice = requireOwned(organization, invoiceId);
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This invoice is already fully paid.");
        }
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This invoice has been cancelled.");
        }
        PaymentMode mode;
        try {
            mode = PaymentMode.valueOf(request.mode().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown payment mode: " + request.mode());
        }
        if (request.amount().compareTo(invoice.balanceDue()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "That's more than the outstanding balance of " + invoice.balanceDue());
        }

        Payment payment = new Payment();
        payment.setPaymentNumber(numberSeriesService.next(organization, "PAYMENT", "PAY", ResetPolicy.YEARLY, 6));
        payment.setAmount(request.amount());
        payment.setMode(mode);
        payment.setReference(request.reference());
        payment.setNote(request.note());
        payment.setReceivedBy(currentUserService.require());
        payment.setReceivedAt(Instant.now());
        invoice.addPayment(payment);

        invoice.setAmountPaid(invoice.getAmountPaid().add(request.amount()));
        invoice.setStatus(invoice.balanceDue().compareTo(BigDecimal.ZERO) <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID);
        invoice = invoiceRepository.save(invoice);
        notifyPaymentReceived(organization, invoice, payment.getAmount());
        return invoice;
    }

    /** Convenience for modules (like Pharmacy) that collect full payment inline at the point of sale. */
    public Invoice createPaidInvoice(Organization organization, Branch branch, Patient patient,
                                      SourceModule sourceModule, List<InvoiceLineItemInput> items, PaymentMode paymentMode) {
        Invoice invoice = createInvoice(organization, branch, patient, sourceModule, items);
        return recordPayment(organization, invoice.getId(),
                new RecordPaymentRequest(invoice.getGrandTotal(), paymentMode.name(), null, "Collected at point of sale"));
    }

    // ---------------- Online payment gateway ----------------

    /** Step 1 of online payment: create an order on the gateway so the frontend can open its checkout widget. */
    @Transactional(readOnly = true)
    public GatewayOrderDto createGatewayOrder(Organization organization, Long invoiceId, CreateGatewayOrderRequest request) {
        if (!addonAccessService.hasAddon(organization, AddonType.PAYMENT_GATEWAY)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Buy the Payment addon to collect online payments — record this one manually (cash/UPI/bank transfer) instead.");
        }
        Invoice invoice = requireOwned(organization, invoiceId);
        if (invoice.balanceDue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This invoice has nothing outstanding to pay.");
        }
        PaymentGatewayService gateway = resolveGateway(request == null ? null : request.gateway());
        GatewayOrderResult result = gateway.createOrder(invoice.balanceDue(), "INR", invoice.getInvoiceNumber());
        return new GatewayOrderDto(invoice.getId(), gateway.gatewayName(), result.gatewayOrderId(), result.amount(), result.currency(), result.publicKey(), result.mock(), java.math.BigDecimal.ZERO);
    }

    /** Step 2: the frontend hands back what the gateway returned after checkout — verify it, then record the payment. */
    public Invoice confirmGatewayPayment(Organization organization, Long invoiceId, ConfirmGatewayPaymentRequest request) {
        Invoice invoice = requireOwned(organization, invoiceId);
        PaymentGatewayService gateway = resolveGateway(request.gateway());

        boolean valid = gateway.verifyPayment(request.gatewayOrderId(), request.gatewayPaymentId(), request.signature());
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This payment could not be verified with the gateway.");
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This invoice is already fully paid.");
        }

        BigDecimal amount = invoice.balanceDue();
        Payment payment = new Payment();
        payment.setPaymentNumber(numberSeriesService.next(organization, "PAYMENT", "PAY", ResetPolicy.YEARLY, 6));
        payment.setAmount(amount);
        payment.setMode(PaymentMode.ONLINE);
        payment.setGateway(gateway.gatewayName());
        payment.setGatewayOrderId(request.gatewayOrderId());
        payment.setGatewayPaymentId(request.gatewayPaymentId());
        payment.setReference(request.gatewayPaymentId());
        payment.setReceivedAt(Instant.now());
        invoice.addPayment(payment);

        invoice.setAmountPaid(invoice.getAmountPaid().add(amount));
        invoice.setStatus(InvoiceStatus.PAID);
        invoice = invoiceRepository.save(invoice);
        notifyPaymentReceived(organization, invoice, amount);
        return invoice;
    }

    // ---------------- Communication Engine hooks ----------------

    private void notifyInvoiceGenerated(Organization organization, Invoice invoice) {
        Patient patient = invoice.getPatient();
        if (patient == null || (isBlank(patient.getEmail()) && isBlank(patient.getPhone()))) return;
        notificationService.notify(organization, NotificationEventType.INVOICE_GENERATED,
                NotificationRecipient.of(patient.fullName(), patient.getEmail(), patient.getPhone()),
                invoiceVariables(organization, invoice, invoice.getGrandTotal()),
                NotificationPriority.NORMAL, "INVOICE", invoice.getId(), null);
    }

    private void notifyPaymentReceived(Organization organization, Invoice invoice, BigDecimal amount) {
        Patient patient = invoice.getPatient();
        if (patient == null || (isBlank(patient.getEmail()) && isBlank(patient.getPhone()))) return;
        notificationService.notify(organization, NotificationEventType.PAYMENT_RECEIVED,
                NotificationRecipient.of(patient.fullName(), patient.getEmail(), patient.getPhone()),
                invoiceVariables(organization, invoice, amount),
                NotificationPriority.NORMAL, "INVOICE", invoice.getId(), null);
    }

    private Map<String, String> invoiceVariables(Organization organization, Invoice invoice, BigDecimal amount) {
        Map<String, String> vars = new HashMap<>();
        vars.put("patientName", invoice.getPatient() != null ? invoice.getPatient().fullName() : "");
        vars.put("organizationName", organization.getName());
        vars.put("invoiceNumber", invoice.getInvoiceNumber());
        vars.put("amount", amount.toPlainString());
        return vars;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private PaymentGatewayService resolveGateway(String name) {
        String key = (name == null || name.isBlank()) ? DEFAULT_GATEWAY : name;
        PaymentGatewayService gateway = gateways.get(key);
        if (gateway == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown payment gateway: " + key);
        }
        return gateway;
    }

    @Transactional(readOnly = true)
    public List<InvoiceDto> list(Organization organization, InvoiceStatus status) {
        return list(organization, status, null);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDto> list(Organization organization, InvoiceStatus status, SourceModule sourceModule) {
        List<Invoice> invoices = status == null
                ? invoiceRepository.findByOrganizationIdOrderByCreatedAtDesc(organization.getId())
                : invoiceRepository.findByOrganizationIdAndStatusOrderByCreatedAtDesc(organization.getId(), status);
        return invoices.stream()
                .filter(i -> sourceModule == null || i.getSourceModule() == sourceModule)
                .map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<InvoiceDto> listForPatient(Organization organization, Long patientId) {
        return invoiceRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .filter(i -> i.getOrganization().getId().equals(organization.getId()))
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public InvoiceDto get(Organization organization, Long invoiceId) {
        return toDto(requireOwned(organization, invoiceId));
    }

    Invoice requireOwned(Organization organization, Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + invoiceId));
        if (!invoice.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This invoice does not belong to your organization.");
        }
        return invoice;
    }

    public InvoiceDto toDto(Invoice invoice) {
        List<InvoiceLineItemDto> lines = invoice.getLineItems().stream()
                .map(i -> new InvoiceLineItemDto(i.getId(), i.getDescription(), i.getSourceType(), i.getSourceId(),
                        i.getQuantity(), i.getUnitPrice(), i.getDiscount(), i.getTaxPercent(), i.getLineTotal()))
                .toList();
        List<PaymentDto> pays = invoice.getPayments().stream()
                .map(p -> new PaymentDto(p.getId(), p.getPaymentNumber(), p.getAmount(), p.getMode().name(), p.getReference(),
                        p.isRefund(), p.getNote(), p.getReceivedBy() != null ? p.getReceivedBy().getFullName() : null, p.getReceivedAt()))
                .toList();
        Patient p = invoice.getPatient();
        return new InvoiceDto(invoice.getId(), invoice.getInvoiceNumber(), invoice.getSourceModule().name(), invoice.getStatus().name(),
                p != null ? new PatientSummaryDto(p.getId(), p.getPatientNumber(), p.fullName(), p.getPhone()) : null,
                lines, pays, invoice.getSubtotal(), invoice.getDiscountTotal(), invoice.getTaxTotal(),
                invoice.getGrandTotal(), invoice.getAmountPaid(), invoice.balanceDue(), invoice.getCreatedAt());
    }
}
