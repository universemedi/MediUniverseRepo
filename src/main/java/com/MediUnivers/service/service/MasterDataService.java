package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.Department;
import com.MediUnivers.service.domain.Manufacturer;
import com.MediUnivers.service.domain.MedicineCategory;
import com.MediUnivers.service.domain.MedicineUnit;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.Specialization;
import com.MediUnivers.service.domain.TaxRule;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.DepartmentRepository;
import com.MediUnivers.service.repository.ManufacturerRepository;
import com.MediUnivers.service.repository.MedicineCategoryRepository;
import com.MediUnivers.service.repository.MedicineUnitRepository;
import com.MediUnivers.service.repository.SpecializationRepository;
import com.MediUnivers.service.repository.TaxRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * The shared Master Data Engine (product spec Volume 3 Part 4): one place
 * every module reads department/specialization/medicine-category/tax-rule/
 * etc. reference data from, instead of each module inventing its own.
 * Platform masters (organization == null) are seeded once and read-only to
 * organizations; organizations add their own on top.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class MasterDataService {

    private final DepartmentRepository departmentRepository;
    private final SpecializationRepository specializationRepository;
    private final MedicineCategoryRepository medicineCategoryRepository;
    private final MedicineUnitRepository medicineUnitRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final TaxRuleRepository taxRuleRepository;

    @Transactional(readOnly = true)
    public List<DepartmentDto> listDepartments(Long organizationId) {
        return departmentRepository.findByOrganizationId(organizationId).stream()
                .map(d -> new DepartmentDto(d.getId(), d.getCode(), d.getName(), d.getStatus()))
                .toList();
    }

    public DepartmentDto createDepartment(Organization organization, CreateDepartmentRequest request) {
        Department d = new Department();
        d.setOrganization(organization);
        d.setCode(request.code().toUpperCase());
        d.setName(request.name());
        d.setStatus("ACTIVE");
        try {
            d = departmentRepository.save(d);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A department with this code already exists.");
        }
        return new DepartmentDto(d.getId(), d.getCode(), d.getName(), d.getStatus());
    }

    @Transactional(readOnly = true)
    public List<SpecializationDto> listSpecializations(Long organizationId) {
        Stream<SpecializationDto> platform = specializationRepository.findByOrganizationIsNull().stream()
                .map(s -> new SpecializationDto(s.getId(), s.getCode(), s.getName(), true));
        Stream<SpecializationDto> org = organizationId == null ? Stream.empty()
                : specializationRepository.findByOrganizationId(organizationId).stream()
                        .map(s -> new SpecializationDto(s.getId(), s.getCode(), s.getName(), false));
        return Stream.concat(platform, org).collect(Collectors.toList());
    }

    public SpecializationDto createSpecialization(Organization organization, CreateSpecializationRequest request) {
        Specialization s = new Specialization();
        s.setOrganization(organization);
        s.setCode(request.code().toUpperCase());
        s.setName(request.name());
        s.setStatus("ACTIVE");
        try {
            s = specializationRepository.save(s);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A specialization with this code already exists.");
        }
        return new SpecializationDto(s.getId(), s.getCode(), s.getName(), false);
    }

    // --- Medicine categories / units / manufacturers (Pharmacy master data) ---

    @Transactional(readOnly = true)
    public List<MasterItemDto> listMedicineCategories(Long organizationId) {
        return merge(
                medicineCategoryRepository.findByOrganizationIsNull(),
                organizationId == null ? List.of() : medicineCategoryRepository.findByOrganizationId(organizationId),
                MedicineCategory::getId, MedicineCategory::getCode, MedicineCategory::getName);
    }

    public MasterItemDto createMedicineCategory(Organization organization, CreateMasterItemRequest request) {
        MedicineCategory c = new MedicineCategory();
        c.setOrganization(organization);
        c.setCode(request.code().toUpperCase());
        c.setName(request.name());
        try {
            c = medicineCategoryRepository.save(c);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A category with this code already exists.");
        }
        return new MasterItemDto(c.getId(), c.getCode(), c.getName(), false);
    }

    @Transactional(readOnly = true)
    public List<MasterItemDto> listMedicineUnits(Long organizationId) {
        return merge(
                medicineUnitRepository.findByOrganizationIsNull(),
                organizationId == null ? List.of() : medicineUnitRepository.findByOrganizationId(organizationId),
                MedicineUnit::getId, MedicineUnit::getCode, MedicineUnit::getName);
    }

    public MasterItemDto createMedicineUnit(Organization organization, CreateMasterItemRequest request) {
        MedicineUnit u = new MedicineUnit();
        u.setOrganization(organization);
        u.setCode(request.code().toUpperCase());
        u.setName(request.name());
        try {
            u = medicineUnitRepository.save(u);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A unit with this code already exists.");
        }
        return new MasterItemDto(u.getId(), u.getCode(), u.getName(), false);
    }

    @Transactional(readOnly = true)
    public List<MasterItemDto> listManufacturers(Long organizationId) {
        return merge(
                manufacturerRepository.findByOrganizationIsNull(),
                organizationId == null ? List.of() : manufacturerRepository.findByOrganizationId(organizationId),
                Manufacturer::getId, Manufacturer::getCode, Manufacturer::getName);
    }

    public MasterItemDto createManufacturer(Organization organization, CreateMasterItemRequest request) {
        Manufacturer m = new Manufacturer();
        m.setOrganization(organization);
        m.setCode(request.code().toUpperCase());
        m.setName(request.name());
        try {
            m = manufacturerRepository.save(m);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A manufacturer with this code already exists.");
        }
        return new MasterItemDto(m.getId(), m.getCode(), m.getName(), false);
    }

    private <T> List<MasterItemDto> merge(
            List<T> platformItems, List<T> orgItems,
            java.util.function.Function<T, Long> id, java.util.function.Function<T, String> code, java.util.function.Function<T, String> name) {
        Stream<MasterItemDto> platform = platformItems.stream().map(i -> new MasterItemDto(id.apply(i), code.apply(i), name.apply(i), true));
        Stream<MasterItemDto> org = orgItems.stream().map(i -> new MasterItemDto(id.apply(i), code.apply(i), name.apply(i), false));
        return Stream.concat(platform, org).collect(Collectors.toList());
    }

    // --- Tax rules / GST slabs (used by Pharmacy, Laboratory, and any future billable module) ---

    @Transactional(readOnly = true)
    public List<TaxRuleDto> listTaxRules(Long organizationId) {
        Stream<TaxRuleDto> platform = taxRuleRepository.findByOrganizationIsNull().stream()
                .map(t -> new TaxRuleDto(t.getId(), t.getCode(), t.getName(), t.getPercentage(), true));
        Stream<TaxRuleDto> org = organizationId == null ? Stream.empty()
                : taxRuleRepository.findByOrganizationId(organizationId).stream()
                        .map(t -> new TaxRuleDto(t.getId(), t.getCode(), t.getName(), t.getPercentage(), false));
        return Stream.concat(platform, org).collect(Collectors.toList());
    }

    public TaxRuleDto createTaxRule(Organization organization, CreateTaxRuleRequest request) {
        TaxRule t = new TaxRule();
        t.setOrganization(organization);
        t.setCode(request.code().toUpperCase());
        t.setName(request.name());
        t.setPercentage(request.percentage());
        t.setActive(true);
        try {
            t = taxRuleRepository.save(t);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A tax rule with this code already exists.");
        }
        return new TaxRuleDto(t.getId(), t.getCode(), t.getName(), t.getPercentage(), false);
    }
}
