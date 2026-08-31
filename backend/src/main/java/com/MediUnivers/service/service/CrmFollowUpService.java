package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.CrmFollowUp;
import com.MediUnivers.service.domain.CrmLead;
import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.dto.CreateCrmFollowUpRequest;
import com.MediUnivers.service.dto.CrmFollowUpDto;
import com.MediUnivers.service.dto.UpdateCrmFollowUpRequest;
import com.MediUnivers.service.repository.AppUserRepository;
import com.MediUnivers.service.repository.CrmFollowUpRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CrmFollowUpService {

    private final CrmFollowUpRepository repository;
    private final AppUserRepository appUserRepository;
    private final CrmLeadService leadService;
    private final AccessService accessService;

    public List<CrmFollowUpDto> list(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CRM);
        return repository.findByOrganizationId(organization.getId()).stream().map(CrmFollowUpService::toDto).toList();
    }

    @Transactional
    public CrmFollowUpDto create(Organization organization, CreateCrmFollowUpRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CRM);
        CrmLead lead = leadService.requireOwned(organization, request.leadId());
        CrmFollowUp f = new CrmFollowUp();
        f.setLead(lead);
        f.setType(request.type());
        f.setDueDate(request.dueDate());
        f.setNotes(request.notes());
        if (request.ownerId() != null) {
            f.setOwner(appUserRepository.findById(request.ownerId())
                    .orElseThrow(() -> new EntityNotFoundException("Staff member not found: " + request.ownerId())));
        }
        return toDto(repository.save(f));
    }

    @Transactional
    public CrmFollowUpDto updateStatus(Organization organization, Long followUpId, UpdateCrmFollowUpRequest request) {
        CrmFollowUp f = repository.findById(followUpId)
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + followUpId));
        if (!f.getLead().getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This follow-up does not belong to your organization.");
        }
        f.setType(request.type());
        f.setDueDate(request.dueDate());
        f.setNotes(request.notes());
        if (request.ownerId() != null) {
            f.setOwner(appUserRepository.findById(request.ownerId())
                    .orElseThrow(() -> new EntityNotFoundException("Staff member not found: " + request.ownerId())));
        } else {
            f.setOwner(null);
        }
        f.setStatus(request.status());
        return toDto(repository.save(f));
    }

    private static CrmFollowUpDto toDto(CrmFollowUp f) {
        return new CrmFollowUpDto(f.getId(), f.getLead().getId(), f.getLead().getName(), f.getType(),
                f.getOwner() != null ? f.getOwner().getId() : null, f.getOwner() != null ? f.getOwner().getFullName() : null,
                f.getDueDate(), f.getNotes(), f.getStatus());
    }
}
