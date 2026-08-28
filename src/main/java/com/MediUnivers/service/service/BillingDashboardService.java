package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.Invoice;
import com.MediUnivers.service.domain.InvoiceStatus;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.Payment;
import com.MediUnivers.service.dto.BillingDashboardDto;
import com.MediUnivers.service.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BillingDashboardService {

    private final InvoiceRepository invoiceRepository;

    public BillingDashboardDto forOrganization(Organization organization) {
        Long orgId = organization.getId();

        long unpaidCount = invoiceRepository.countByOrganizationIdAndStatus(orgId, InvoiceStatus.UNPAID)
                + invoiceRepository.countByOrganizationIdAndStatus(orgId, InvoiceStatus.PARTIALLY_PAID);
        List<Invoice> unpaid = invoiceRepository.findByOrganizationIdAndStatusOrderByCreatedAtDesc(orgId, InvoiceStatus.UNPAID);
        List<Invoice> partiallyPaid = invoiceRepository.findByOrganizationIdAndStatusOrderByCreatedAtDesc(orgId, InvoiceStatus.PARTIALLY_PAID);
        BigDecimal outstanding = unpaid.stream().map(Invoice::balanceDue).reduce(BigDecimal.ZERO, BigDecimal::add)
                .add(partiallyPaid.stream().map(Invoice::balanceDue).reduce(BigDecimal.ZERO, BigDecimal::add));

        List<Invoice> todaysInvoices = invoiceRepository.findByOrganizationIdAndCreatedAtAfterOrderByCreatedAtDesc(
                orgId, LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant());
        BigDecimal todaysCollections = todaysInvoices.stream()
                .flatMap(i -> i.getPayments().stream())
                .filter(p -> !p.isRefund())
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new BillingDashboardDto(unpaidCount, outstanding, todaysInvoices.size(), todaysCollections);
    }
}
