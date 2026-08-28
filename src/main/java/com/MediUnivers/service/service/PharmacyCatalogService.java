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

/** Suppliers and the Medicine master — the catalogue everything else in Pharmacy references. */
@Service
@RequiredArgsConstructor
@Transactional
public class PharmacyCatalogService {

    private final SupplierRepository supplierRepository;
    private final MedicineRepository medicineRepository;
    private final MedicineCategoryRepository categoryRepository;
    private final MedicineUnitRepository unitRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final BatchRepository batchRepository;
    private final AccessService accessService;

    @Transactional(readOnly = true)
    public List<SupplierDto> listSuppliers(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        return supplierRepository.findByOrganizationId(organization.getId()).stream().map(this::toDto).toList();
    }

    public SupplierDto createSupplier(Organization organization, CreateSupplierRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        Supplier s = new Supplier();
        s.setOrganization(organization);
        s.setName(request.name());
        s.setContactName(request.contactName());
        s.setPhone(request.phone());
        s.setEmail(request.email());
        s.setAddress(request.address());
        s.setGstNumber(request.gstNumber());
        s.setStatus("ACTIVE");
        s = supplierRepository.save(s);
        return toDto(s);
    }

    @Transactional(readOnly = true)
    public List<MedicineDto> listMedicines(Organization organization, Long branchId, String search) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        List<Medicine> medicines = (search == null || search.isBlank())
                ? medicineRepository.findByOrganizationIdOrderByNameAsc(organization.getId())
                : medicineRepository.search(organization.getId(), search.trim());
        return medicines.stream().map(m -> toDto(m, branchId)).toList();
    }

    public MedicineDto createMedicine(Organization organization, CreateMedicineRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        Medicine m = new Medicine();
        m.setOrganization(organization);
        m.setCode(request.code().toUpperCase());
        m.setName(request.name());
        if (request.categoryId() != null) m.setCategory(categoryRepository.findById(request.categoryId()).orElse(null));
        if (request.unitId() != null) m.setUnit(unitRepository.findById(request.unitId()).orElse(null));
        if (request.manufacturerId() != null) m.setManufacturer(manufacturerRepository.findById(request.manufacturerId()).orElse(null));
        m.setHsnCode(request.hsnCode());
        m.setTaxPercent(request.taxPercent() != null ? request.taxPercent() : java.math.BigDecimal.ZERO);
        m.setReorderLevel(request.reorderLevel() != null ? request.reorderLevel() : 10);
        m.setControlled(request.controlled());
        m.setAllowSubstitution(request.allowSubstitution());
        m.setStatus("ACTIVE");
        try {
            m = medicineRepository.save(m);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A medicine with this code already exists.");
        }
        return toDto(m, null);
    }

    Medicine requireOwned(Organization organization, Long medicineId) {
        Medicine m = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new EntityNotFoundException("Medicine not found: " + medicineId));
        if (!m.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This medicine does not belong to your organization.");
        }
        return m;
    }

    private SupplierDto toDto(Supplier s) {
        return new SupplierDto(s.getId(), s.getName(), s.getContactName(), s.getPhone(), s.getEmail(), s.getAddress(), s.getGstNumber(), s.getStatus());
    }

    private MedicineDto toDto(Medicine m, Long branchId) {
        int stock = branchId == null ? 0 : batchRepository.findByMedicineIdAndBranchIdOrderByExpiryDateAsc(m.getId(), branchId)
                .stream().mapToInt(Batch::getQuantityAvailable).sum();
        return new MedicineDto(m.getId(), m.getCode(), m.getName(),
                m.getCategory() != null ? m.getCategory().getName() : null,
                m.getUnit() != null ? m.getUnit().getName() : null,
                m.getManufacturer() != null ? m.getManufacturer().getName() : null,
                m.getHsnCode(), m.getTaxPercent(), m.getReorderLevel(), m.isControlled(), m.isAllowSubstitution(),
                m.getStatus(), stock);
    }
}
