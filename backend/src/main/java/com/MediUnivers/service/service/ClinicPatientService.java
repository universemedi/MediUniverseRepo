package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.BranchRepository;
import com.MediUnivers.service.repository.FamilyMemberRepository;
import com.MediUnivers.service.repository.PatientRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class ClinicPatientService {

    private final PatientRepository patientRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final BranchRepository branchRepository;
    private final NumberSeriesService numberSeriesService;
    private final AccessService accessService;

    @Transactional(readOnly = true)
    public List<PatientDto> list(Organization organization, String search) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);
        List<Patient> patients = (search == null || search.isBlank())
                ? patientRepository.findByOrganizationIdOrderByCreatedAtDesc(organization.getId())
                : patientRepository.search(organization.getId(), search.trim());
        return patients.stream().map(this::toDto).toList();
    }

    public PatientDto create(Organization organization, CreatePatientRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);

        Branch branch = null;
        if (request.branchId() != null) {
            branch = branchRepository.findById(request.branchId())
                    .filter(b -> b.getOrganization().getId().equals(organization.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch does not belong to this organization."));
        }

        Patient p = new Patient();
        p.setOrganization(organization);
        p.setBranch(branch);
        p.setPatientNumber(numberSeriesService.next(organization, "PATIENT", "PAT", ResetPolicy.NEVER, 6));
        p.setFirstName(request.firstName());
        p.setLastName(request.lastName());
        if (request.gender() != null && !request.gender().isBlank()) {
            p.setGender(Gender.valueOf(request.gender().toUpperCase(Locale.ROOT)));
        }
        p.setDateOfBirth(request.dateOfBirth());
        p.setPhone(request.phone());
        p.setEmail(request.email());
        p.setBloodGroup(request.bloodGroup());
        p.setAddress(request.address());
        p.setStatus("ACTIVE");
        p = patientRepository.save(p);
        return toDto(p);
    }

    @Transactional(readOnly = true)
    public PatientDto get(Organization organization, Long patientId) {
        Patient p = requireOwned(organization, patientId);
        return toDto(p);
    }

    public FamilyMemberDto addFamilyMember(Organization organization, Long patientId, CreateFamilyMemberRequest request) {
        Patient patient = requireOwned(organization, patientId);
        FamilyMember m = new FamilyMember();
        m.setPatient(patient);
        m.setName(request.name());
        m.setRelation(request.relation());
        if (request.gender() != null && !request.gender().isBlank()) {
            m.setGender(Gender.valueOf(request.gender().toUpperCase(Locale.ROOT)));
        }
        m.setDateOfBirth(request.dateOfBirth());
        m.setPhone(request.phone());
        m = familyMemberRepository.save(m);
        return new FamilyMemberDto(m.getId(), m.getName(), m.getRelation(),
                m.getGender() != null ? m.getGender().name() : null, m.getDateOfBirth(), m.getPhone());
    }

    @Transactional(readOnly = true)
    public List<FamilyMemberDto> listFamilyMembers(Organization organization, Long patientId) {
        requireOwned(organization, patientId);
        return familyMemberRepository.findByPatientId(patientId).stream()
                .map(m -> new FamilyMemberDto(m.getId(), m.getName(), m.getRelation(),
                        m.getGender() != null ? m.getGender().name() : null, m.getDateOfBirth(), m.getPhone()))
                .toList();
    }

    Patient requireOwned(Organization organization, Long patientId) {
        Patient p = patientRepository.findById(patientId)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + patientId));
        if (!p.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This patient does not belong to your organization.");
        }
        return p;
    }

    /** Used by public website booking — no login, so we match on phone within the org or register a new patient. */
    public Patient findOrCreateByPhone(Organization organization, String firstName, String lastName, String phone, String email) {
        return patientRepository.findByOrganizationIdAndPhone(organization.getId(), phone)
                .orElseGet(() -> {
                    Patient p = new Patient();
                    p.setOrganization(organization);
                    p.setPatientNumber(numberSeriesService.next(organization, "PATIENT", "PAT", ResetPolicy.NEVER, 6));
                    p.setFirstName(firstName);
                    p.setLastName(lastName);
                    p.setPhone(phone);
                    p.setEmail(email);
                    p.setStatus("ACTIVE");
                    return patientRepository.save(p);
                });
    }

    private PatientDto toDto(Patient p) {
        return new PatientDto(p.getId(), p.getPatientNumber(), p.getFirstName(), p.getLastName(),
                p.getGender() != null ? p.getGender().name() : null, p.getDateOfBirth(), p.getPhone(), p.getEmail(),
                p.getBloodGroup(), p.getAddress(), p.getStatus(),
                p.getBranch() != null ? p.getBranch().getId() : null,
                p.getBranch() != null ? p.getBranch().getName() : null);
    }
}
