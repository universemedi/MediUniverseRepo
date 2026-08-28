package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.LabOrder;
import com.MediUnivers.service.domain.LabOrderStatus;
import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.Patient;
import com.MediUnivers.service.dto.LabOrderItemDto;
import com.MediUnivers.service.dto.LabReportDto;
import com.MediUnivers.service.dto.PatientSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

/**
 * Reports are generated only after verification (spec rule #10). This is
 * data-only for now — a PDF renderer can sit on top of the same DTO later
 * without changing this contract.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LabReportService {

    private final LabOrderService orderService;
    private final AccessService accessService;

    public LabReportDto report(Organization organization, Long orderId) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        LabOrder order = orderService.requireOwned(organization, orderId);
        if (order.getStatus() != LabOrderStatus.VERIFIED && order.getStatus() != LabOrderStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This report isn't available until every result is verified.");
        }
        List<LabOrderItemDto> items = orderService.toDto(order).items();
        Patient p = order.getPatient();
        Instant reportedAt = items.stream()
                .map(LabOrderItemDto::result)
                .filter(r -> r != null && r.verifiedAt() != null)
                .map(r -> r.verifiedAt())
                .max(Instant::compareTo)
                .orElse(order.getCreatedAt());
        return new LabReportDto(order.getId(), order.getOrderNumber(), organization.getName(),
                new PatientSummaryDto(p.getId(), p.getPatientNumber(), p.fullName(), p.getPhone()),
                order.getDoctor() != null ? order.getDoctor().getFullName() : null,
                items, reportedAt);
    }
}
