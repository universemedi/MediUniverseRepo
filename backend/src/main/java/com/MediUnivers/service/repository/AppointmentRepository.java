package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Appointment;
import com.MediUnivers.service.domain.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByOrganizationIdAndAppointmentDateOrderByScheduledAtAsc(Long organizationId, LocalDate date);
    List<Appointment> findByOrganizationIdAndDoctorIdAndAppointmentDate(Long organizationId, Long doctorId, LocalDate date);
    List<Appointment> findByPatientIdOrderByAppointmentDateDesc(Long patientId);
    long countByOrganizationIdAndAppointmentDateAndStatus(Long organizationId, LocalDate date, AppointmentStatus status);
    long countByOrganizationIdAndAppointmentDate(Long organizationId, LocalDate date);

    /** Cross-organization counts — platform dashboard only, never tenant-scoped. */
    long countByAppointmentDate(LocalDate date);
    long countByAppointmentDateBetween(LocalDate startInclusive, LocalDate endInclusive);
}
