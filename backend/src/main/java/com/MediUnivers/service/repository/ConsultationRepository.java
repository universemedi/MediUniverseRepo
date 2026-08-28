package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Consultation;
import com.MediUnivers.service.domain.PharmacyQueueStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {
    Optional<Consultation> findByAppointmentId(Long appointmentId);
    List<Consultation> findByPatientIdOrderByStartedAtDesc(Long patientId);
    List<Consultation> findByDoctorIdOrderByStartedAtDesc(Long doctorId);
    List<Consultation> findByOrganizationIdAndPharmacyStatusIn(Long organizationId, List<PharmacyQueueStatus> statuses);
}
