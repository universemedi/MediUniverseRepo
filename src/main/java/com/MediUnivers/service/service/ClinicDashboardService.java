package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.AppointmentStatus;
import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.dto.ClinicDashboardDto;
import com.MediUnivers.service.repository.AppointmentRepository;
import com.MediUnivers.service.repository.DoctorRepository;
import com.MediUnivers.service.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClinicDashboardService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AccessService accessService;

    public ClinicDashboardDto forOrganization(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);
        LocalDate today = LocalDate.now();
        Long orgId = organization.getId();
        return new ClinicDashboardDto(
                appointmentRepository.countByOrganizationIdAndAppointmentDate(orgId, today),
                appointmentRepository.countByOrganizationIdAndAppointmentDateAndStatus(orgId, today, AppointmentStatus.CHECKED_IN),
                appointmentRepository.countByOrganizationIdAndAppointmentDateAndStatus(orgId, today, AppointmentStatus.IN_CONSULTATION),
                appointmentRepository.countByOrganizationIdAndAppointmentDateAndStatus(orgId, today, AppointmentStatus.COMPLETED),
                patientRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId).size(),
                doctorRepository.findByOrganizationId(orgId).size()
        );
    }
}
