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

    public DepartmentDto updateDepartment(Organization organization, Long id, UpdateDepartmentRequest request) {
        Department d = requireOwnedDepartment(organization, id);
        d.setName(request.name());
        if (request.status() != null && !request.status().isBlank()) {
            d.setStatus(request.status());
        }
        return new DepartmentDto(d.getId(), d.getCode(), d.getName(), d.getStatus());
    }

    public void deactivateDepartment(Organization organization, Long id) {
        Department d = requireOwnedDepartment(organization, id);
        d.setStatus("INACTIVE");
    }

    private Department requireOwnedDepartment(Organization organization, Long id) {
        Department d = departmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found."));
        if (!d.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This department does not belong to your organization.");
        }
        return d;
    }

    @Transactional(readOnly = true)
    public List<SpecializationDto> listSpecializations(Long organizationId) {
        Stream<SpecializationDto> platform = specializationRepository.findByOrganizationIsNull().stream()
                .map(s -> new SpecializationDto(s.getId(), s.getCode(), s.getName(), s.getStatus(), true));
        Stream<SpecializationDto> org = organizationId == null ? Stream.empty()
                : specializationRepository.findByOrganizationId(organizationId).stream()
                        .map(s -> new SpecializationDto(s.getId(), s.getCode(), s.getName(), s.getStatus(), false));
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
        return new SpecializationDto(s.getId(), s.getCode(), s.getName(), s.getStatus(), false);
    }

    public SpecializationDto updateSpecialization(Organization organization, Long id, UpdateMasterItemRequest request) {
        Specialization s = requireOwnedSpecialization(organization, id);
        s.setName(request.name());
        if (request.status() != null && !request.status().isBlank()) {
            s.setStatus(request.status());
        }
        return new SpecializationDto(s.getId(), s.getCode(), s.getName(), s.getStatus(), false);
    }

    public void deactivateSpecialization(Organization organization, Long id) {
        requireOwnedSpecialization(organization, id).setStatus("INACTIVE");
    }

    private Specialization requireOwnedSpecialization(Organization organization, Long id) {
        Specialization s = specializationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Specialization not found."));
        if (s.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This is a platform default and can't be changed.");
        }
        if (!s.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This specialization does not belong to your organization.");
        }
        return s;
    }

    // --- Medicine categories / units / manufacturers (Pharmacy master data) ---

    @Transactional(readOnly = true)
    public List<MasterItemDto> listMedicineCategories(Long organizationId) {
        return merge(
                medicineCategoryRepository.findByOrganizationIsNull(),
                organizationId == null ? List.of() : medicineCategoryRepository.findByOrganizationId(organizationId),
                MedicineCategory::getId, MedicineCategory::getCode, MedicineCategory::getName, MedicineCategory::getStatus);
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
        return new MasterItemDto(c.getId(), c.getCode(), c.getName(), c.getStatus(), false);
    }

    public MasterItemDto updateMedicineCategory(Organization organization, Long id, UpdateMasterItemRequest request) {
        MedicineCategory c = requireOwnedMedicineCategory(organization, id);
        c.setName(request.name());
        if (request.status() != null && !request.status().isBlank()) {
            c.setStatus(request.status());
        }
        return new MasterItemDto(c.getId(), c.getCode(), c.getName(), c.getStatus(), false);
    }

    public void deactivateMedicineCategory(Organization organization, Long id) {
        requireOwnedMedicineCategory(organization, id).setStatus("INACTIVE");
    }

    private MedicineCategory requireOwnedMedicineCategory(Organization organization, Long id) {
        MedicineCategory c = medicineCategoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found."));
        if (c.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This is a platform default and can't be changed.");
        }
        if (!c.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This category does not belong to your organization.");
        }
        return c;
    }

    @Transactional(readOnly = true)
    public List<MasterItemDto> listMedicineUnits(Long organizationId) {
        return merge(
                medicineUnitRepository.findByOrganizationIsNull(),
                organizationId == null ? List.of() : medicineUnitRepository.findByOrganizationId(organizationId),
                MedicineUnit::getId, MedicineUnit::getCode, MedicineUnit::getName, MedicineUnit::getStatus);
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
        return new MasterItemDto(u.getId(), u.getCode(), u.getName(), u.getStatus(), false);
    }

    public MasterItemDto updateMedicineUnit(Organization organization, Long id, UpdateMasterItemRequest request) {
        MedicineUnit u = requireOwnedMedicineUnit(organization, id);
        u.setName(request.name());
        if (request.status() != null && !request.status().isBlank()) {
            u.setStatus(request.status());
        }
        return new MasterItemDto(u.getId(), u.getCode(), u.getName(), u.getStatus(), false);
    }

    public void deactivateMedicineUnit(Organization organization, Long id) {
        requireOwnedMedicineUnit(organization, id).setStatus("INACTIVE");
    }

    private MedicineUnit requireOwnedMedicineUnit(Organization organization, Long id) {
        MedicineUnit u = medicineUnitRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unit not found."));
        if (u.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This is a platform default and can't be changed.");
        }
        if (!u.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This unit does not belong to your organization.");
        }
        return u;
    }

    @Transactional(readOnly = true)
    public List<MasterItemDto> listManufacturers(Long organizationId) {
        return merge(
                manufacturerRepository.findByOrganizationIsNull(),
                organizationId == null ? List.of() : manufacturerRepository.findByOrganizationId(organizationId),
                Manufacturer::getId, Manufacturer::getCode, Manufacturer::getName, Manufacturer::getStatus);
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
        return new MasterItemDto(m.getId(), m.getCode(), m.getName(), m.getStatus(), false);
    }

    public MasterItemDto updateManufacturer(Organization organization, Long id, UpdateMasterItemRequest request) {
        Manufacturer m = requireOwnedManufacturer(organization, id);
        m.setName(request.name());
        if (request.status() != null && !request.status().isBlank()) {
            m.setStatus(request.status());
        }
        return new MasterItemDto(m.getId(), m.getCode(), m.getName(), m.getStatus(), false);
    }

    public void deactivateManufacturer(Organization organization, Long id) {
        requireOwnedManufacturer(organization, id).setStatus("INACTIVE");
    }

    private Manufacturer requireOwnedManufacturer(Organization organization, Long id) {
        Manufacturer m = manufacturerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manufacturer not found."));
        if (m.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This is a platform default and can't be changed.");
        }
        if (!m.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This manufacturer does not belong to your organization.");
        }
        return m;
    }

    private <T> List<MasterItemDto> merge(
            List<T> platformItems, List<T> orgItems,
            java.util.function.Function<T, Long> id, java.util.function.Function<T, String> code,
            java.util.function.Function<T, String> name, java.util.function.Function<T, String> status) {
        Stream<MasterItemDto> platform = platformItems.stream()
                .map(i -> new MasterItemDto(id.apply(i), code.apply(i), name.apply(i), status.apply(i), true));
        Stream<MasterItemDto> org = orgItems.stream()
                .map(i -> new MasterItemDto(id.apply(i), code.apply(i), name.apply(i), status.apply(i), false));
        return Stream.concat(platform, org).collect(Collectors.toList());
    }

    // --- Tax rules / GST slabs (used by Pharmacy, Laboratory, and any future billable module) ---

    @Transactional(readOnly = true)
    public List<TaxRuleDto> listTaxRules(Long organizationId) {
        Stream<TaxRuleDto> platform = taxRuleRepository.findByOrganizationIsNull().stream()
                .map(t -> new TaxRuleDto(t.getId(), t.getCode(), t.getName(), t.getPercentage(), t.isActive(), true));
        Stream<TaxRuleDto> org = organizationId == null ? Stream.empty()
                : taxRuleRepository.findByOrganizationId(organizationId).stream()
                        .map(t -> new TaxRuleDto(t.getId(), t.getCode(), t.getName(), t.getPercentage(), t.isActive(), false));
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
        return new TaxRuleDto(t.getId(), t.getCode(), t.getName(), t.getPercentage(), t.isActive(), false);
    }

    public TaxRuleDto updateTaxRule(Organization organization, Long id, UpdateTaxRuleRequest request) {
        TaxRule t = requireOwnedTaxRule(organization, id);
        t.setName(request.name());
        t.setPercentage(request.percentage());
        t.setActive(request.active());
        return new TaxRuleDto(t.getId(), t.getCode(), t.getName(), t.getPercentage(), t.isActive(), false);
    }

    public void deactivateTaxRule(Organization organization, Long id) {
        requireOwnedTaxRule(organization, id).setActive(false);
    }

    private TaxRule requireOwnedTaxRule(Organization organization, Long id) {
        TaxRule t = taxRuleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tax rule not found."));
        if (t.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This is a platform default and can't be changed.");
        }
        if (!t.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This tax rule does not belong to your organization.");
        }
        return t;
    }
}
