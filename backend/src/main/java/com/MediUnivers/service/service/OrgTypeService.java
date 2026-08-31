package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.OrgType;
import com.MediUnivers.service.dto.CreateOrgTypeRequest;
import com.MediUnivers.service.dto.OrgTypeDto;
import com.MediUnivers.service.dto.UpdateOrgTypeRequest;
import com.MediUnivers.service.repository.OrgTypeRepository;
import com.MediUnivers.service.security.CurrentUserService;
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
public class OrgTypeService {

    private final OrgTypeRepository repository;
    private final AuditLogService auditLogService;
    private final CurrentUserService currentUserService;

    /** Public catalog — active types only, shown on the signup/login screens. */
    public List<OrgTypeDto> listAll() {
        return repository.findAll().stream()
                .filter(OrgType::isActive)
                .map(DtoMapper::toDto).toList();
    }

    /** Platform admin view — every organization type, active or not. */
    public List<OrgTypeDto> listAllForAdmin() {
        return repository.findAll().stream().map(DtoMapper::toDto).toList();
    }

    public OrgType requireByCode(String code) {
        return repository.findByCode(code)
                .orElseThrow(() -> new EntityNotFoundException("Unknown organization type: " + code));
    }

    @Transactional
    public OrgTypeDto create(CreateOrgTypeRequest request) {
        if (repository.findByCode(request.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An organization type with this code already exists.");
        }
        OrgType t = new OrgType();
        t.setCode(request.code());
        applyFields(t, request.name(), request.description(), request.modules(), true);
        OrgType saved = repository.save(t);
        auditLogService.record(currentUserService.require(), "CREATED", "ORG_TYPE", saved.getCode(), null);
        return DtoMapper.toDto(saved);
    }

    @Transactional
    public OrgTypeDto update(Long id, UpdateOrgTypeRequest request) {
        OrgType t = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Organization type not found: " + id));
        applyFields(t, request.name(), request.description(), request.modules(), request.active());
        return DtoMapper.toDto(repository.save(t));
    }

    /** Soft delete — existing organizations keep working even if their type is later hidden from the signup catalog. */
    @Transactional
    public void deactivate(Long id) {
        OrgType t = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Organization type not found: " + id));
        t.setActive(false);
        repository.save(t);
    }

    private void applyFields(OrgType t, String name, String description,
                              java.util.Set<com.MediUnivers.service.domain.ModuleGroup> modules, boolean active) {
        t.setName(name);
        t.setDescription(description);
        t.getModules().clear();
        if (modules != null) t.getModules().addAll(modules);
        t.setActive(active);
    }
}
