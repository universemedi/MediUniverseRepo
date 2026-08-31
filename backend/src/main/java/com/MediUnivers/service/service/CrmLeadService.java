package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.CreateCrmLeadRequest;
import com.MediUnivers.service.dto.CrmLeadDto;
import com.MediUnivers.service.dto.UpdateCrmLeadRequest;
import com.MediUnivers.service.repository.AppUserRepository;
import com.MediUnivers.service.repository.CrmLeadRepository;
import com.MediUnivers.service.repository.CrmLeadSourceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CrmLeadService {

    private final CrmLeadRepository repository;
    private final CrmLeadSourceRepository sourceRepository;
    private final AppUserRepository appUserRepository;
    private final AccessService accessService;

    public List<CrmLeadDto> list(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CRM);
        return repository.findByOrganizationIdOrderByCreatedAtDesc(organization.getId()).stream()
                .map(CrmLeadService::toDto).toList();
    }

    @Transactional
    public CrmLeadDto create(Organization organization, CreateCrmLeadRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CRM);
        CrmLead lead = new CrmLead();
        lead.setOrganization(organization);
        lead.setName(request.name());
        lead.setPhone(request.phone());
        lead.setEmail(request.email());
        lead.setValue(request.value() != null ? request.value() : BigDecimal.ZERO);
        if (request.sourceId() != null) {
            lead.setSource(sourceRepository.findById(request.sourceId())
                    .orElseThrow(() -> new EntityNotFoundException("Lead source not found: " + request.sourceId())));
        }
        if (request.ownerId() != null) {
            lead.setOwner(appUserRepository.findById(request.ownerId())
                    .orElseThrow(() -> new EntityNotFoundException("Staff member not found: " + request.ownerId())));
        }
        return toDto(repository.save(lead));
    }

    @Transactional
    public CrmLeadDto update(Organization organization, Long leadId, UpdateCrmLeadRequest request) {
        CrmLead lead = requireOwned(organization, leadId);
        if (request.sourceId() != null) {
            lead.setSource(sourceRepository.findById(request.sourceId())
                    .orElseThrow(() -> new EntityNotFoundException("Lead source not found: " + request.sourceId())));
        } else {
            lead.setSource(null);
        }
        if (request.ownerId() != null) {
            lead.setOwner(appUserRepository.findById(request.ownerId())
                    .orElseThrow(() -> new EntityNotFoundException("Staff member not found: " + request.ownerId())));
        } else {
            lead.setOwner(null);
        }
        lead.setValue(request.value() != null ? request.value() : BigDecimal.ZERO);
        try {
            lead.setStatus(LeadStatus.valueOf(request.status().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown lead status: " + request.status());
        }
        return toDto(repository.save(lead));
    }

    CrmLead requireOwned(Organization organization, Long leadId) {
        CrmLead lead = repository.findById(leadId)
                .orElseThrow(() -> new EntityNotFoundException("Lead not found: " + leadId));
        if (!lead.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This lead does not belong to your organization.");
        }
        return lead;
    }

    private static CrmLeadDto toDto(CrmLead l) {
        return new CrmLeadDto(l.getId(), l.getName(), l.getPhone(), l.getEmail(),
                l.getSource() != null ? l.getSource().getId() : null, l.getSource() != null ? l.getSource().getName() : null,
                l.getOwner() != null ? l.getOwner().getId() : null, l.getOwner() != null ? l.getOwner().getFullName() : null,
                l.getValue(), l.getStatus().name(), l.getCreatedAt());
    }
}
