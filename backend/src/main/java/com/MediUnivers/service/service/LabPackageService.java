package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.LabPackage;
import com.MediUnivers.service.domain.LabTest;
import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.dto.CreateLabPackageRequest;
import com.MediUnivers.service.dto.LabPackageDto;
import com.MediUnivers.service.dto.UpdateLabPackageRequest;
import com.MediUnivers.service.repository.LabPackageRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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

    @Transactional
    public LabPackageDto update(Organization organization, Long id, UpdateLabPackageRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        LabPackage p = requireOwned(organization, id);
        p.setName(request.name());
        p.setPrice(request.price());
        p.setDiscountPercent(request.discountPercent() != null ? request.discountPercent() : java.math.BigDecimal.ZERO);
        Set<LabTest> tests = new HashSet<>();
        for (Long testId : request.testIds()) {
            tests.add(catalogService.requireOwned(organization, testId));
        }
        p.setTests(tests);
        if (request.status() != null && !request.status().isBlank()) {
            p.setStatus(request.status());
        }
        return toDto(repository.save(p));
    }

    @Transactional
    public void deactivate(Organization organization, Long id) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        LabPackage p = requireOwned(organization, id);
        p.setStatus("INACTIVE");
        repository.save(p);
    }

    private LabPackage requireOwned(Organization organization, Long id) {
        LabPackage p = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Lab package not found: " + id));
        if (!p.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This package does not belong to your organization.");
        }
        return p;
    }

    private static LabPackageDto toDto(LabPackage p) {
        List<Long> testIds = p.getTests().stream().map(LabTest::getId).sorted().toList();
        List<String> testNames = p.getTests().stream().map(LabTest::getName).sorted().toList();
        return new LabPackageDto(p.getId(), p.getName(), p.getPrice(), p.getDiscountPercent(), testIds, testNames, p.getStatus());
    }
}
