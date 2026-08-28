package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** Test categories and the Test Master — the catalogue everything else in Laboratory references. */
@Service
@RequiredArgsConstructor
@Transactional
public class LabCatalogService {

    private final LabTestCategoryRepository categoryRepository;
    private final LabTestRepository testRepository;
    private final DepartmentRepository departmentRepository;
    private final AccessService accessService;

    @Transactional(readOnly = true)
    public List<MasterItemDto> listCategories(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        Stream<MasterItemDto> platform = categoryRepository.findByOrganizationIsNull().stream()
                .map(c -> new MasterItemDto(c.getId(), c.getCode(), c.getName(), true));
        Stream<MasterItemDto> org = categoryRepository.findByOrganizationId(organization.getId()).stream()
                .map(c -> new MasterItemDto(c.getId(), c.getCode(), c.getName(), false));
        return Stream.concat(platform, org).collect(Collectors.toList());
    }

    public MasterItemDto createCategory(Organization organization, CreateMasterItemRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        LabTestCategory c = new LabTestCategory();
        c.setOrganization(organization);
        c.setCode(request.code().toUpperCase(Locale.ROOT));
        c.setName(request.name());
        try {
            c = categoryRepository.save(c);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A category with this code already exists.");
        }
        return new MasterItemDto(c.getId(), c.getCode(), c.getName(), false);
    }

    @Transactional(readOnly = true)
    public List<LabTestDto> listTests(Organization organization, String search) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        List<LabTest> tests = (search == null || search.isBlank())
                ? testRepository.findByOrganizationIdOrderByNameAsc(organization.getId())
                : testRepository.search(organization.getId(), search.trim());
        return tests.stream().map(this::toDto).toList();
    }

    public LabTestDto createTest(Organization organization, CreateLabTestRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        LabTest t = new LabTest();
        t.setOrganization(organization);
        t.setCode(request.code().toUpperCase(Locale.ROOT));
        t.setName(request.name());
        if (request.categoryId() != null) t.setCategory(categoryRepository.findById(request.categoryId()).orElse(null));
        if (request.departmentId() != null) t.setDepartment(departmentRepository.findById(request.departmentId()).orElse(null));
        t.setSampleType(request.sampleType());
        t.setPrice(request.price());
        t.setTaxPercent(request.taxPercent() != null ? request.taxPercent() : java.math.BigDecimal.ZERO);
        t.setTatHours(request.tatHours() != null ? request.tatHours() : 24);
        t.setStatus("ACTIVE");
        if (request.referenceRanges() != null) {
            for (LabReferenceRangeInput input : request.referenceRanges()) {
                LabReferenceRange range = new LabReferenceRange();
                if (input.gender() != null && !input.gender().isBlank()) {
                    range.setGender(Gender.valueOf(input.gender().toUpperCase(Locale.ROOT)));
                }
                range.setAgeMin(input.ageMin());
                range.setAgeMax(input.ageMax());
                range.setMinValue(input.minValue());
                range.setMaxValue(input.maxValue());
                range.setCriticalLow(input.criticalLow());
                range.setCriticalHigh(input.criticalHigh());
                range.setUnit(input.unit());
                t.addReferenceRange(range);
            }
        }
        try {
            t = testRepository.save(t);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A test with this code already exists.");
        }
        return toDto(t);
    }

    LabTest requireOwned(Organization organization, Long testId) {
        LabTest t = testRepository.findById(testId)
                .orElseThrow(() -> new EntityNotFoundException("Lab test not found: " + testId));
        if (!t.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This test does not belong to your organization.");
        }
        return t;
    }

    private LabTestDto toDto(LabTest t) {
        List<LabReferenceRangeDto> ranges = t.getReferenceRanges().stream()
                .map(r -> new LabReferenceRangeDto(r.getId(), r.getGender() != null ? r.getGender().name() : null,
                        r.getAgeMin(), r.getAgeMax(), r.getMinValue(), r.getMaxValue(), r.getCriticalLow(), r.getCriticalHigh(), r.getUnit()))
                .toList();
        return new LabTestDto(t.getId(), t.getCode(), t.getName(),
                t.getCategory() != null ? t.getCategory().getName() : null,
                t.getDepartment() != null ? t.getDepartment().getName() : null,
                t.getSampleType(), t.getPrice(), t.getTaxPercent(), t.getTatHours(), t.getStatus(), ranges);
    }
}
