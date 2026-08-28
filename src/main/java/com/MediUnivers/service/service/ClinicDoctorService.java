package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class ClinicDoctorService {

    private final DoctorRepository doctorRepository;
    private final DoctorAvailabilityRepository availabilityRepository;
    private final SpecializationRepository specializationRepository;
    private final BranchRepository branchRepository;
    private final RoleRepository roleRepository;
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccessService accessService;

    @Transactional(readOnly = true)
    public List<DoctorDto> list(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);
        return doctorRepository.findByOrganizationId(organization.getId()).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public DoctorDto myProfile(Organization organization, Long appUserId) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);
        Doctor d = doctorRepository.findByAppUserId(appUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No doctor profile linked to this account."));
        if (!d.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This doctor does not belong to your organization.");
        }
        return toDto(d);
    }

    /** Creating a doctor also creates their login (Portal.TENANT, role DOCTOR) — one step, ready to use. */
    public DoctorDto create(Organization organization, CreateDoctorRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);

        if (appUserRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        // A doctor's login occupies a seat just like any other staff account (spec §30) —
        // enforced here too, not just in UserService, so this creation path can't be used
        // to bypass the subscription's user limit.
        long occupiedSeats = appUserRepository.countByOrganizationIdAndStatusIn(
                organization.getId(), List.of(UserStatus.ACTIVE, UserStatus.INVITED));
        if (occupiedSeats >= organization.getPlan().getMaxUsers()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Your subscription user limit has been reached.");
        }
        Branch branch = null;
        if (request.branchId() != null) {
            branch = branchRepository.findById(request.branchId())
                    .filter(b -> b.getOrganization().getId().equals(organization.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch does not belong to this organization."));
        }

        Role doctorRole = roleRepository.findByCode("DOCTOR")
                .orElseThrow(() -> new IllegalStateException("System role DOCTOR is missing — check DataSeeder"));

        AppUser user = new AppUser();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.tempPassword()));
        user.setFullName(request.fullName());
        user.setPortal(Portal.TENANT);
        user.setRole(doctorRole);
        user.setOrganization(organization);
        user.setBranch(branch);
        user.setStatus(UserStatus.ACTIVE);
        user = appUserRepository.save(user);

        Doctor doctor = new Doctor();
        doctor.setOrganization(organization);
        doctor.setBranch(branch);
        doctor.setAppUser(user);
        doctor.setFullName(request.fullName());
        doctor.setQualification(request.qualification());
        doctor.setExperienceYears(request.experienceYears());
        doctor.setConsultationFee(request.consultationFee());
        doctor.setTaxPercent(request.taxPercent() != null ? request.taxPercent() : java.math.BigDecimal.ZERO);
        doctor.setStatus("ACTIVE");
        if (request.specializationIds() != null && !request.specializationIds().isEmpty()) {
            Set<Specialization> specs = new HashSet<>(specializationRepository.findAllById(request.specializationIds()));
            doctor.setSpecializations(specs);
        }
        doctor = doctorRepository.save(doctor);
        return toDto(doctor);
    }

    public List<AvailabilitySlotDto> setAvailability(Organization organization, Long doctorId, SetAvailabilityRequest request) {
        Doctor doctor = requireOwned(organization, doctorId);
        availabilityRepository.deleteByDoctorId(doctor.getId());
        for (AvailabilitySlotDto slot : request.slots()) {
            DoctorAvailability a = new DoctorAvailability();
            a.setDoctor(doctor);
            a.setDayOfWeek(slot.dayOfWeek());
            a.setStartTime(slot.startTime());
            a.setEndTime(slot.endTime());
            a.setSlotMinutes(slot.slotMinutes() > 0 ? slot.slotMinutes() : 15);
            availabilityRepository.save(a);
        }
        return listAvailability(organization, doctorId);
    }

    @Transactional(readOnly = true)
    public List<AvailabilitySlotDto> listAvailability(Organization organization, Long doctorId) {
        Doctor doctor = requireOwned(organization, doctorId);
        return availabilityRepository.findByDoctorId(doctor.getId()).stream()
                .map(a -> new AvailabilitySlotDto(a.getDayOfWeek(), a.getStartTime(), a.getEndTime(), a.getSlotMinutes()))
                .toList();
    }

    Doctor requireOwned(Organization organization, Long doctorId) {
        Doctor d = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new EntityNotFoundException("Doctor not found: " + doctorId));
        if (!d.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This doctor does not belong to your organization.");
        }
        return d;
    }

    private DoctorDto toDto(Doctor d) {
        return new DoctorDto(d.getId(), d.getFullName(), d.getQualification(), d.getExperienceYears(),
                d.getConsultationFee(), d.getTaxPercent(), d.getSpecializations().stream().map(Specialization::getName).toList(),
                d.getStatus(), d.getAppUser() != null ? d.getAppUser().getEmail() : null,
                d.getBranch() != null ? d.getBranch().getId() : null,
                d.getBranch() != null ? d.getBranch().getName() : null);
    }
}
