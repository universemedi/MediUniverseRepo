package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

/**
 * Walk-in sales and prescription dispensing — both go through the same cart,
 * FIFO/FEFO batch allocation, and stock-ledger write. Pharmacy never creates
 * its own invoice number system; this sale record carries everything a real
 * Billing Engine invoice would need (spec §15) so wiring one in later is a
 * swap, not a rewrite.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PharmacySaleService {

    private final PharmacySaleRepository saleRepository;
    private final BatchRepository batchRepository;
    private final BranchRepository branchRepository;
    private final PatientRepository patientRepository;
    private final ConsultationRepository consultationRepository;
    private final PharmacyCatalogService catalogService;
    private final PharmacyInventoryService inventoryService;
    private final NumberSeriesService numberSeriesService;
    private final AccessService accessService;
    private final BillingService billingService;

    @Transactional(readOnly = true)
    public List<PharmacySaleDto> list(Organization organization, boolean todayOnly) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        List<PharmacySale> sales = todayOnly
                ? saleRepository.findByOrganizationIdAndCreatedAtAfterOrderByCreatedAtDesc(
                        organization.getId(), LocalDate.now().atStartOfDay(java.time.ZoneOffset.UTC).toInstant())
                : saleRepository.findByOrganizationIdOrderByCreatedAtDesc(organization.getId());
        return sales.stream().map(this::toDto).toList();
    }

    public PharmacySaleDto createSale(Organization organization, SaleType type, CreateSaleRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);

        Branch branch = request.branchId() != null
                ? branchRepository.findById(request.branchId())
                        .filter(b -> b.getOrganization().getId().equals(organization.getId()))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch does not belong to this organization."))
                : branchRepository.findByOrganizationId(organization.getId()).stream().findFirst()
                        .orElseThrow(() -> new EntityNotFoundException("Organization has no branches yet."));

        PharmacySale sale = new PharmacySale();
        sale.setOrganization(organization);
        sale.setBranch(branch);
        sale.setType(type);
        sale.setSaleNumber(numberSeriesService.next(organization, "PHARMACY_SALE", "SAL", ResetPolicy.YEARLY, 6));
        try {
            sale.setPaymentMode(PaymentMode.valueOf(request.paymentMode().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown payment mode: " + request.paymentMode());
        }

        if (request.patientId() != null) {
            sale.setPatient(patientRepository.findById(request.patientId())
                    .filter(p -> p.getOrganization().getId().equals(organization.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown patient.")));
        }
        Consultation consultation = null;
        if (request.consultationId() != null) {
            consultation = consultationRepository.findById(request.consultationId())
                    .filter(c -> c.getOrganization().getId().equals(organization.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown consultation."));
            sale.setConsultation(consultation);
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal discountTotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        List<InvoiceLineItemInput> invoiceLines = new java.util.ArrayList<>();

        for (SaleCartItemInput cartItem : request.items()) {
            if (cartItem.quantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than zero.");
            }
            Medicine medicine = catalogService.requireOwned(organization, cartItem.medicineId());
            int remaining = cartItem.quantity();
            BigDecimal discountPerUnit = cartItem.discount() != null ? cartItem.discount() : BigDecimal.ZERO;
            // GST configurable at the entry level: use the override if the pharmacist set one
            // for this sale line, otherwise fall back to the medicine's configured GST rate.
            BigDecimal taxPercent = cartItem.taxPercent() != null ? cartItem.taxPercent() : medicine.getTaxPercent();

            List<Batch> allocatable = cartItem.batchId() != null
                    ? List.of(batchRepository.findById(cartItem.batchId())
                            .filter(b -> b.getBranch().getId().equals(branch.getId()) && !b.isExpired())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected batch is unavailable or expired.")))
                    : batchRepository.lockAllocatableBatches(medicine.getId(), branch.getId(), LocalDate.now());

            for (Batch batch : allocatable) {
                if (remaining <= 0) break;
                if (batch.getQuantityAvailable() <= 0) continue;
                int take = Math.min(remaining, batch.getQuantityAvailable());

                batch.setQuantityAvailable(batch.getQuantityAvailable() - take);
                inventoryService.recordMovement(organization, branch, medicine, batch, StockMovementType.SALE_OUT, -take, "PHARMACY_SALE", null);

                BigDecimal lineSubtotal = batch.getMrp().multiply(BigDecimal.valueOf(take));
                BigDecimal lineDiscount = discountPerUnit.multiply(BigDecimal.valueOf(take));
                BigDecimal taxable = lineSubtotal.subtract(lineDiscount);
                BigDecimal lineTax = taxable.multiply(taxPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                BigDecimal lineTotal = taxable.add(lineTax);

                PharmacySaleItem item = new PharmacySaleItem();
                item.setMedicine(medicine);
                item.setBatch(batch);
                item.setQuantity(take);
                item.setMrp(batch.getMrp());
                item.setDiscount(lineDiscount);
                item.setTaxPercent(taxPercent);
                item.setLineTotal(lineTotal);
                sale.addItem(item);

                invoiceLines.add(new InvoiceLineItemInput(
                        medicine.getName() + " (batch " + batch.getBatchNumber() + ")",
                        "PHARMACY_SALE_ITEM", medicine.getId(), take, batch.getMrp(), discountPerUnit, taxPercent));

                subtotal = subtotal.add(lineSubtotal);
                discountTotal = discountTotal.add(lineDiscount);
                taxTotal = taxTotal.add(lineTax);
                remaining -= take;
            }

            if (remaining > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Not enough available (non-expired) stock of " + medicine.getName() + " to complete this sale.");
            }
        }

        sale.setSubtotal(subtotal);
        sale.setDiscountTotal(discountTotal);
        sale.setTaxTotal(taxTotal);
        sale.setGrandTotal(subtotal.subtract(discountTotal).add(taxTotal));
        sale = saleRepository.save(sale);

        if (consultation != null) {
            boolean fullyDispensed = consultation.getPrescriptionItems().size() <= sale.getItems().size();
            consultation.setPharmacyStatus(fullyDispensed ? PharmacyQueueStatus.DISPENSED : PharmacyQueueStatus.PARTIALLY_DISPENSED);
        }

        // Pharmacy never creates its own invoice (spec §15) — the Billing Engine does,
        // and since a counter sale collects payment immediately, we record it paid in
        // the same step rather than leaving it sitting UNPAID.
        Invoice invoice = billingService.createPaidInvoice(organization, branch, sale.getPatient(), SourceModule.PHARMACY, invoiceLines, sale.getPaymentMode());
        sale.setInvoice(invoice);

        return toDto(sale);
    }

    PharmacySale requireOwned(Organization organization, Long saleId) {
        PharmacySale s = saleRepository.findById(saleId)
                .orElseThrow(() -> new EntityNotFoundException("Sale not found: " + saleId));
        if (!s.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This sale does not belong to your organization.");
        }
        return s;
    }

    private PharmacySaleDto toDto(PharmacySale s) {
        List<PharmacySaleItemDto> items = s.getItems().stream()
                .map(i -> new PharmacySaleItemDto(i.getId(), i.getMedicine().getName(), i.getBatch().getBatchNumber(),
                        i.getQuantity(), i.getQuantityReturned(), i.getMrp(), i.getDiscount(), i.getTaxPercent(), i.getLineTotal()))
                .toList();
        return new PharmacySaleDto(s.getId(), s.getSaleNumber(), s.getType().name(), s.getStatus().name(),
                s.getPatient() != null ? s.getPatient().fullName() : null,
                s.getConsultation() != null ? s.getConsultation().getId() : null,
                items, s.getSubtotal(), s.getDiscountTotal(), s.getTaxTotal(), s.getGrandTotal(),
                s.getPaymentMode().name(), s.getCreatedAt(), s.getInvoice() != null ? s.getInvoice().getId() : null);
    }
}
