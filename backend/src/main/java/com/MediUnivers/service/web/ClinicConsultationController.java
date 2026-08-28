package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.CompleteConsultationRequest;
import com.MediUnivers.service.dto.ConsultationDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.ClinicConsultationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/clinic/consultations")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class ClinicConsultationController {

    private final ClinicConsultationService consultationService;
    private final CurrentUserService currentUserService;

    @PostMapping("/start/{appointmentId}")
    public ConsultationDto start(@PathVariable Long appointmentId) {
        return consultationService.start(requireOrgUser().getOrganization(), appointmentId);
    }

    @PutMapping("/{id}/complete")
    public ConsultationDto complete(@PathVariable Long id, @Valid @RequestBody CompleteConsultationRequest request) {
        return consultationService.complete(requireOrgUser().getOrganization(), id, request);
    }

    @GetMapping("/{id}")
    public ConsultationDto get(@PathVariable Long id) {
        return consultationService.get(requireOrgUser().getOrganization(), id);
    }

    @GetMapping("/patient/{patientId}")
    public List<ConsultationDto> historyForPatient(@PathVariable Long patientId) {
        return consultationService.historyForPatient(requireOrgUser().getOrganization(), patientId);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
