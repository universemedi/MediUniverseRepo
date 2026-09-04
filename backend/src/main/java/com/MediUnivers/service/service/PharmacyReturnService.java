package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.PharmacyReturnRepository;
import com.MediUnivers.service.repository.PharmacySaleItemRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;

/** Sales returns — always against an original invoice/sale, full or partial, with mandatory reason and refund mode. */
@Service
@RequiredArgsConstructor
@Transactional
public class PharmacyReturnService {

    private final PharmacyReturnRepository returnRepository;
    private final PharmacySaleItemRepository saleItemRepository;
    private final PharmacySaleService saleService;
    private final PharmacyInventoryService inventoryService;
    private final NumberSeriesService numberSeriesService;
    private final AccessService accessService;
    private final BillingService billingService;

    @Transactional(readOnly = true)
    public List<PharmacyReturnDto> list(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        return returnRepository.findByOrganizationIdOrderByCreatedAtDesc(organization.getId()).stream().map(this::toDto).toList();
    }

    public PharmacyReturnDto createReturn(Organization organization, CreateReturnRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        PharmacySale sale = saleService.requireOwned(organization, request.saleId());

        PaymentMode refundMode;
        try {
            refundMode = PaymentMode.valueOf(request.refundMode().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown refund mode: " + request.refundMode());
        }

        PharmacyReturn ret = new PharmacyReturn();
        ret.setOrganization(organization);
        ret.setSale(sale);
        ret.setReason(request.reason());
        ret.setRefundMode(refundMode);
        ret.setReturnNumber(numberSeriesService.next(organization, "PHARMACY_RETURN", "RET", ResetPolicy.YEARLY, 6));

        BigDecimal totalRefund = BigDecimal.ZERO;
        for (ReturnItemInput input : request.items()) {
            PharmacySaleItem saleItem = saleItemRepository.findById(input.saleItemId())
                    .filter(i -> i.getSale().getId().equals(sale.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "This item is not part of the selected sale."));

            int alreadyReturned = saleItem.getQuantityReturned();
            int returnable = saleItem.getQuantity() - alreadyReturned;
            if (input.quantity() > returnable) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Only " + returnable + " unit(s) of " + saleItem.getMedicine().getName() + " can still be returned.");
            }

            BigDecimal unitTotal = saleItem.getLineTotal().divide(BigDecimal.valueOf(saleItem.getQuantity()), 4, RoundingMode.HALF_UP);
            BigDecimal amount = unitTotal.multiply(BigDecimal.valueOf(input.quantity())).setScale(2, RoundingMode.HALF_UP);

            PharmacyReturnItem returnItem = new PharmacyReturnItem();
            returnItem.setSaleItem(saleItem);
            returnItem.setQuantity(input.quantity());
            returnItem.setAmount(amount);
            ret.addItem(returnItem);

            saleItem.setQuantityReturned(alreadyReturned + input.quantity());

            Batch batch = saleItem.getBatch();
            // Only put it back on the shelf if it hasn't expired since the original sale.
            if (!batch.isExpired()) {
                batch.setQuantityAvailable(batch.getQuantityAvailable() + input.quantity());
                inventoryService.recordMovement(organization, sale.getBranch(), saleItem.getMedicine(), batch,
                        StockMovementType.RETURN_IN, input.quantity(), "PHARMACY_RETURN", null);
            }

            totalRefund = totalRefund.add(amount);
        }

        ret.setRefundAmount(totalRefund);
        ret = returnRepository.save(ret);

        if (sale.getInvoice() != null && totalRefund.signum() > 0) {
            billingService.applyReturnCredit(organization, sale.getInvoice().getId(), totalRefund, refundMode,
                    "Return " + ret.getReturnNumber() + " — " + request.reason());
        }

        return toDto(ret);
    }

    private PharmacyReturnDto toDto(PharmacyReturn r) {
        return new PharmacyReturnDto(r.getId(), r.getReturnNumber(), r.getSale().getSaleNumber(), r.getReason(),
                r.getRefundMode().name(), r.getRefundAmount(), r.getCreatedAt());
    }
}
