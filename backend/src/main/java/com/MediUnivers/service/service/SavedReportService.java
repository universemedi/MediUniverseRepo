package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.SavedReport;
import com.MediUnivers.service.dto.CreateSavedReportRequest;
import com.MediUnivers.service.dto.SavedReportDto;
import com.MediUnivers.service.repository.SavedReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SavedReportService {

    private final SavedReportRepository repository;
    private final AccessService accessService;

    public List<SavedReportDto> list(Organization organization, ModuleGroup group) {
        accessService.requireModuleEnabled(organization, group);
        return repository.findByOrganizationIdAndModuleGroupOrderByGeneratedAtDesc(organization.getId(), group)
                .stream().map(SavedReportService::toDto).toList();
    }

    @Transactional
    public SavedReportDto create(Organization organization, ModuleGroup group, CreateSavedReportRequest request) {
        accessService.requireModuleEnabled(organization, group);
        SavedReport r = new SavedReport();
        r.setOrganization(organization);
        r.setModuleGroup(group);
        r.setName(request.name());
        r.setCategory(request.category());
        r.setPeriod(request.period());
        return toDto(repository.save(r));
    }

    private static SavedReportDto toDto(SavedReport r) {
        return new SavedReportDto(r.getId(), r.getName(), r.getCategory(), r.getPeriod(), r.getStatus(), r.getGeneratedAt());
    }
}
