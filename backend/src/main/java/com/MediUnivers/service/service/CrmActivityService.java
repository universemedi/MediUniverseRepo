package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.CrmActivity;
import com.MediUnivers.service.domain.CrmLead;
import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.dto.CreateCrmActivityRequest;
import com.MediUnivers.service.dto.CrmActivityDto;
import com.MediUnivers.service.repository.CrmActivityRepository;
import com.MediUnivers.service.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Append-only activity timeline — no update or delete, matching CrmActivity's own doc comment. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CrmActivityService {

    private final CrmActivityRepository repository;
    private final CrmLeadService leadService;
    private final CurrentUserService currentUserService;
    private final AccessService accessService;

    public List<CrmActivityDto> list(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CRM);
        return repository.findByOrganizationId(organization.getId()).stream().map(CrmActivityService::toDto).toList();
    }

    @Transactional
    public CrmActivityDto create(Organization organization, CreateCrmActivityRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CRM);
        CrmLead lead = leadService.requireOwned(organization, request.leadId());
        CrmActivity a = new CrmActivity();
        a.setLead(lead);
        a.setActivityType(request.activityType());
        a.setNotes(request.notes());
        a.setOwner(currentUserService.require());
        return toDto(repository.save(a));
    }

    private static CrmActivityDto toDto(CrmActivity a) {
        return new CrmActivityDto(a.getId(), a.getLead().getId(), a.getLead().getName(), a.getActivityType(),
                a.getOwner() != null ? a.getOwner().getId() : null, a.getOwner() != null ? a.getOwner().getFullName() : null,
                a.getNotes(), a.getCreatedAt());
    }
}
