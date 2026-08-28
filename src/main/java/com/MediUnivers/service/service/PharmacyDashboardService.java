package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.PharmacyDashboardDto;
import com.MediUnivers.service.repository.BatchRepository;
import com.MediUnivers.service.repository.BranchRepository;
import com.MediUnivers.service.repository.ConsultationRepository;
import com.MediUnivers.service.repository.PharmacySaleRepository;
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
public class PharmacyDashboardService {

    private final ConsultationRepository consultationRepository;
    private final PharmacySaleRepository saleRepository;
    private final BatchRepository batchRepository;
    private final BranchRepository branchRepository;
    private final AccessService accessService;

    public PharmacyDashboardDto forOrganization(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        Long orgId = organization.getId();

        long pending = consultationRepository
                .findByOrganizationIdAndPharmacyStatusIn(orgId, List.of(PharmacyQueueStatus.PENDING, PharmacyQueueStatus.PARTIALLY_DISPENSED))
                .size();

        List<PharmacySale> todaySales = saleRepository.findByOrganizationIdAndCreatedAtAfterOrderByCreatedAtDesc(
                orgId, LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant());
        BigDecimal revenue = todaySales.stream().map(PharmacySale::getGrandTotal).reduce(BigDecimal.ZERO, BigDecimal::add);

        long lowStock = 0;
        for (Branch branch : branchRepository.findByOrganizationId(orgId)) {
            List<Batch> batches = batchRepository.findByOrganizationIdAndBranchId(orgId, branch.getId());
            lowStock += batches.stream()
                    .collect(java.util.stream.Collectors.groupingBy(Batch::getMedicine, java.util.stream.Collectors.summingInt(Batch::getQuantityAvailable)))
                    .entrySet().stream().filter(e -> e.getValue() < e.getKey().getReorderLevel()).count();
        }

        long expiringSoon = batchRepository.findExpiringSoon(orgId, LocalDate.now().plusDays(30)).size();

        return new PharmacyDashboardDto(pending, todaySales.size(), revenue, lowStock, expiringSoon);
    }
}
