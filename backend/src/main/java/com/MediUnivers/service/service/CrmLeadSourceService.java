package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.CrmLeadSource;
import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.dto.CreateCrmLeadSourceRequest;
import com.MediUnivers.service.dto.CrmLeadSourceDto;
import com.MediUnivers.service.repository.CrmLeadSourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CrmLeadSourceService {

    private final CrmLeadSourceRepository repository;
    private final AccessService accessService;

    public List<CrmLeadSourceDto> list(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CRM);
        return repository.findByOrganizationId(organization.getId()).stream().map(CrmLeadSourceService::toDto).toList();
    }

    @Transactional
    public CrmLeadSourceDto create(Organization organization, CreateCrmLeadSourceRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CRM);
        CrmLeadSource s = new CrmLeadSource();
        s.setOrganization(organization);
        s.setCode(request.code());
        s.setName(request.name());
        return toDto(repository.save(s));
    }

    private static CrmLeadSourceDto toDto(CrmLeadSource s) {
        return new CrmLeadSourceDto(s.getId(), s.getCode(), s.getName(), s.getStatus());
    }
}
