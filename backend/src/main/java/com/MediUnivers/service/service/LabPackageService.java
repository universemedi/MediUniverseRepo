package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.LabPackage;
import com.MediUnivers.service.domain.LabTest;
import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.dto.CreateLabPackageRequest;
import com.MediUnivers.service.dto.LabPackageDto;
import com.MediUnivers.service.repository.LabPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LabPackageService {

    private final LabPackageRepository repository;
    private final LabCatalogService catalogService;
    private final AccessService accessService;

    public List<LabPackageDto> list(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        return repository.findByOrganizationId(organization.getId()).stream().map(LabPackageService::toDto).toList();
    }

    @Transactional
    public LabPackageDto create(Organization organization, CreateLabPackageRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        LabPackage p = new LabPackage();
        p.setOrganization(organization);
        p.setName(request.name());
        p.setPrice(request.price());
        p.setDiscountPercent(request.discountPercent() != null ? request.discountPercent() : java.math.BigDecimal.ZERO);
        Set<LabTest> tests = new HashSet<>();
        for (Long testId : request.testIds()) {
            tests.add(catalogService.requireOwned(organization, testId));
        }
        p.setTests(tests);
        return toDto(repository.save(p));
    }

    private static LabPackageDto toDto(LabPackage p) {
        List<String> testNames = p.getTests().stream().map(LabTest::getName).sorted().toList();
        return new LabPackageDto(p.getId(), p.getName(), p.getPrice(), p.getDiscountPercent(), testNames, p.getStatus());
    }
}
