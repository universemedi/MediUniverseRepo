package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.Consultation;
import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.PharmacyQueueStatus;
import com.MediUnivers.service.dto.PharmacyQueueItemDto;
import com.MediUnivers.service.repository.ConsultationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Every completed consultation with a prescription automatically becomes a
 * pharmacy queue item — no manual entry (spec §4). This reads directly off
 * Consultation rather than duplicating a queue table.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PharmacyQueueService {

    private final ConsultationRepository consultationRepository;
    private final AccessService accessService;

    public List<PharmacyQueueItemDto> pending(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        return consultationRepository
                .findByOrganizationIdAndPharmacyStatusIn(organization.getId(),
                        List.of(PharmacyQueueStatus.PENDING, PharmacyQueueStatus.PARTIALLY_DISPENSED))
                .stream()
                .map(this::toDto)
                .toList();
    }

    private PharmacyQueueItemDto toDto(Consultation c) {
        return new PharmacyQueueItemDto(c.getId(), c.getPatient().fullName(), c.getPatient().getPatientNumber(),
                c.getDoctor().getFullName(), c.getPrescriptionItems().size(), c.getPharmacyStatus().name());
    }
}
