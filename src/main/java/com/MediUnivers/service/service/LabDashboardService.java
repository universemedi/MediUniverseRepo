package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.LabOrderStatus;
import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.dto.LabDashboardDto;
import com.MediUnivers.service.repository.LabOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LabDashboardService {

    private final LabOrderRepository orderRepository;
    private final AccessService accessService;

    public LabDashboardDto forOrganization(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        Long orgId = organization.getId();
        long total = orderRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId).size();
        return new LabDashboardDto(
                total,
                orderRepository.countByOrganizationIdAndStatus(orgId, LabOrderStatus.SAMPLE_PENDING),
                orderRepository.countByOrganizationIdAndStatus(orgId, LabOrderStatus.PROCESSING)
                        + orderRepository.countByOrganizationIdAndStatus(orgId, LabOrderStatus.COLLECTED),
                orderRepository.countByOrganizationIdAndStatus(orgId, LabOrderStatus.RESULT_READY),
                orderRepository.countByOrganizationIdAndStatus(orgId, LabOrderStatus.VERIFIED),
                orderRepository.countByOrganizationIdAndStatus(orgId, LabOrderStatus.REJECTED)
        );
    }
}
