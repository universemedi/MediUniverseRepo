package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.*;
import com.MediUnivers.service.security.CurrentUserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Purchase Orders, Goods Receipt (GRN), the stock ledger, and stock
 * transfers — everything that moves medicine into, out of, or between
 * branches. Every quantity change anywhere in Pharmacy is paired with a
 * StockLedgerEntry so the movement history is always reconstructable.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PharmacyInventoryService {

    private final SupplierRepository supplierRepository;
    private final BranchRepository branchRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final BatchRepository batchRepository;
    private final StockLedgerEntryRepository ledgerRepository;
    private final StockTransferRepository stockTransferRepository;
    private final PharmacyCatalogService catalogService;
    private final NumberSeriesService numberSeriesService;
    private final AccessService accessService;
    private final CurrentUserService currentUserService;

    // ---------------- Purchase Orders ----------------

    @Transactional(readOnly = true)
    public List<PurchaseOrderDto> listPurchaseOrders(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        return purchaseOrderRepository.findByOrganizationIdOrderByCreatedAtDesc(organization.getId()).stream().map(this::toDto).toList();
    }

    public PurchaseOrderDto createPurchaseOrder(Organization organization, CreatePurchaseOrderRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        Supplier supplier = supplierRepository.findById(request.supplierId())
                .filter(s -> s.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown supplier."));

        PurchaseOrder po = new PurchaseOrder();
        po.setOrganization(organization);
        po.setBranch(resolveBranch(organization, request.branchId()));
        po.setSupplier(supplier);
        po.setPoNumber(numberSeriesService.next(organization, "PURCHASE_ORDER", "PO", ResetPolicy.YEARLY, 6));
        po.setStatus(PurchaseOrderStatus.ORDERED);
        for (PurchaseOrderItemInput input : request.items()) {
            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setMedicine(catalogService.requireOwned(organization, input.medicineId()));
            item.setQuantityOrdered(input.quantity());
            item.setRate(input.rate());
            po.addItem(item);
        }
        po = purchaseOrderRepository.save(po);
        return toDto(po);
    }

    /** Only safe before anything has been received against it — once goods have arrived, the
     * receipt (and the stock it created) is the record; cancelling the PO wouldn't undo that. */
    public void cancelPurchaseOrder(Organization organization, Long purchaseOrderId) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
                .filter(p -> p.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Purchase order not found: " + purchaseOrderId));
        if (po.getStatus() == PurchaseOrderStatus.CANCELLED) return;
        if (po.getStatus() == PurchaseOrderStatus.RECEIVED || po.getStatus() == PurchaseOrderStatus.PARTIALLY_RECEIVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Goods have already been received against this order — it can't be cancelled.");
        }
        po.setStatus(PurchaseOrderStatus.CANCELLED);
    }

    // ---------------- Goods Receipt (GRN) ----------------

    @Transactional(readOnly = true)
    public List<GoodsReceiptDto> listGoodsReceipts(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        return goodsReceiptRepository.findByOrganizationIdOrderByReceivedAtDesc(organization.getId())
                .stream().map(this::toDto).toList();
    }

    public GoodsReceiptDto receiveGoods(Organization organization, CreateGoodsReceiptRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        Supplier supplier = supplierRepository.findById(request.supplierId())
                .filter(s -> s.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown supplier."));
        Branch branch = resolveBranch(organization, request.branchId());

        PurchaseOrder po = null;
        if (request.purchaseOrderId() != null) {
            po = purchaseOrderRepository.findById(request.purchaseOrderId())
                    .filter(p -> p.getOrganization().getId().equals(organization.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown purchase order."));
        }

        GoodsReceipt grn = new GoodsReceipt();
        grn.setOrganization(organization);
        grn.setBranch(branch);
        grn.setSupplier(supplier);
        grn.setPurchaseOrder(po);
        grn.setGrnNumber(numberSeriesService.next(organization, "GRN", "GRN", ResetPolicy.YEARLY, 6));
        grn.setSupplierInvoiceNumber(request.supplierInvoiceNumber());
        grn.setSupplierInvoiceDate(request.supplierInvoiceDate());

        for (GoodsReceiptItemInput input : request.items()) {
            Medicine medicine = catalogService.requireOwned(organization, input.medicineId());

            GoodsReceiptItem grnItem = new GoodsReceiptItem();
            grnItem.setMedicine(medicine);
            grnItem.setBatchNumber(input.batchNumber());
            grnItem.setExpiryDate(input.expiryDate());
            grnItem.setManufacturingDate(input.manufacturingDate());
            grnItem.setQuantity(input.quantity());
            grnItem.setPurchasePrice(input.purchasePrice());
            grnItem.setMrp(input.mrp());
            grn.addItem(grnItem);

            Batch batch = new Batch();
            batch.setOrganization(organization);
            batch.setBranch(branch);
            batch.setMedicine(medicine);
            batch.setSupplier(supplier);
            batch.setBatchNumber(input.batchNumber());
            batch.setExpiryDate(input.expiryDate());
            batch.setManufacturingDate(input.manufacturingDate());
            batch.setPurchasePrice(input.purchasePrice());
            batch.setMrp(input.mrp());
            batch.setQuantityReceived(input.quantity());
            batch.setQuantityAvailable(input.quantity());
            batch = batchRepository.save(batch);
            grnItem.setBatch(batch);

            recordMovement(organization, branch, medicine, batch, StockMovementType.GRN_IN, input.quantity(), "GRN", null);

            if (po != null) {
                po.getItems().stream()
                        .filter(i -> i.getMedicine().getId().equals(medicine.getId()))
                        .findFirst()
                        .ifPresent(i -> i.setQuantityReceived(i.getQuantityReceived() + input.quantity()));
            }
        }

        if (po != null) {
            boolean allReceived = po.getItems().stream().allMatch(i -> i.getQuantityReceived() >= i.getQuantityOrdered());
            po.setStatus(allReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED);
        }

        grn = goodsReceiptRepository.save(grn);
        return toDto(grn);
    }

    /** Undoes a wrongly-entered GRN — only possible while every batch it created is still exactly
     * as received (nothing sold, transferred or adjusted out of it yet). */
    public GoodsReceiptDto reverseGoodsReceipt(Organization organization, Long grnId) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        GoodsReceipt grn = goodsReceiptRepository.findById(grnId)
                .filter(g -> g.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Goods receipt not found: " + grnId));
        if ("REVERSED".equals(grn.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This goods receipt has already been reversed.");
        }
        for (GoodsReceiptItem item : grn.getItems()) {
            Batch batch = item.getBatch();
            if (batch == null || batch.getQuantityAvailable() != batch.getQuantityReceived()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Some stock from batch " + item.getBatchNumber() + " has already been sold, transferred or adjusted — reverse that first, or use a stock adjustment instead.");
            }
        }
        for (GoodsReceiptItem item : grn.getItems()) {
            Batch batch = item.getBatch();
            batch.setQuantityAvailable(0);
            recordMovement(organization, grn.getBranch(), item.getMedicine(), batch,
                    StockMovementType.GRN_REVERSAL, -item.getQuantity(), "GRN_REVERSAL", null);
        }
        PurchaseOrder po = grn.getPurchaseOrder();
        if (po != null) {
            for (GoodsReceiptItem item : grn.getItems()) {
                po.getItems().stream()
                        .filter(i -> i.getMedicine().getId().equals(item.getMedicine().getId()))
                        .findFirst()
                        .ifPresent(i -> i.setQuantityReceived(Math.max(0, i.getQuantityReceived() - item.getQuantity())));
            }
            boolean anyReceived = po.getItems().stream().anyMatch(i -> i.getQuantityReceived() > 0);
            boolean allReceived = po.getItems().stream().allMatch(i -> i.getQuantityReceived() >= i.getQuantityOrdered());
            po.setStatus(allReceived ? PurchaseOrderStatus.RECEIVED : anyReceived ? PurchaseOrderStatus.PARTIALLY_RECEIVED : PurchaseOrderStatus.ORDERED);
        }
        grn.setStatus("REVERSED");
        return toDto(goodsReceiptRepository.save(grn));
    }

    private GoodsReceiptDto toDto(GoodsReceipt grn) {
        List<GoodsReceiptItemDto> items = grn.getItems().stream()
                .map(i -> new GoodsReceiptItemDto(i.getId(), i.getMedicine().getName(), i.getBatchNumber(),
                        i.getExpiryDate(), i.getManufacturingDate(), i.getQuantity(), i.getPurchasePrice(), i.getMrp()))
                .toList();
        return new GoodsReceiptDto(grn.getId(), grn.getGrnNumber(), grn.getSupplier().getName(),
                grn.getBranch() != null ? grn.getBranch().getName() : null,
                grn.getPurchaseOrder() != null ? grn.getPurchaseOrder().getPoNumber() : null,
                grn.getSupplierInvoiceNumber(), grn.getSupplierInvoiceDate(), grn.getStatus(), grn.getReceivedAt(), items);
    }

    // ---------------- Stock queries ----------------

    @Transactional(readOnly = true)
    public List<BatchDto> listBatches(Organization organization, Long medicineId, Long branchId) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        return batchRepository.findByMedicineIdAndBranchIdOrderByExpiryDateAsc(medicineId, branchId).stream()
                .map(b -> new BatchDto(b.getId(), b.getBatchNumber(), b.getExpiryDate(), b.getManufacturingDate(), b.getPurchasePrice(), b.getMrp(),
                        b.getQuantityReceived(), b.getQuantityAvailable(), b.getSupplier() != null ? b.getSupplier().getName() : null, b.isExpired()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LowStockDto> lowStock(Organization organization, Long branchId) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        List<Batch> batches = batchRepository.findByOrganizationIdAndBranchId(organization.getId(), branchId);
        Map<Medicine, Integer> stockByMedicine = batches.stream()
                .collect(Collectors.groupingBy(Batch::getMedicine, Collectors.summingInt(Batch::getQuantityAvailable)));
        return stockByMedicine.entrySet().stream()
                .filter(e -> e.getValue() < e.getKey().getReorderLevel())
                .map(e -> new LowStockDto(e.getKey().getId(), e.getKey().getName(), e.getKey().getReorderLevel(), e.getValue()))
                .sorted((a, b) -> Integer.compare(a.currentStock(), b.currentStock()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExpiringBatchDto> expiringSoon(Organization organization, int withinDays) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        return batchRepository.findExpiringSoon(organization.getId(), LocalDate.now().plusDays(withinDays)).stream()
                .map(b -> new ExpiringBatchDto(b.getId(), b.getMedicine().getName(), b.getBatchNumber(), b.getExpiryDate(), b.getQuantityAvailable()))
                .toList();
    }

    /** Every batch across every medicine and branch — the org-wide "pharmacy/batches" view. */
    @Transactional(readOnly = true)
    public List<OrgBatchDto> listAllBatches(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        return batchRepository.findByOrganizationIdOrderByExpiryDateAsc(organization.getId()).stream()
                .map(b -> new OrgBatchDto(b.getId(), b.getBatchNumber(), b.getMedicine().getName(), b.getBranch().getName(),
                        b.getExpiryDate(), b.getMrp(), b.getQuantityAvailable(), b.isExpired()))
                .toList();
    }

    /** Low-stock alerts across every branch — the same reorder-level check as {@link #lowStock}, just not scoped to one branch. */
    @Transactional(readOnly = true)
    public List<LowStockAlertDto> lowStockAllBranches(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        List<Batch> batches = batchRepository.findByOrganizationIdOrderByExpiryDateAsc(organization.getId());
        Map<String, List<Batch>> byBranchAndMedicine = batches.stream()
                .collect(Collectors.groupingBy(b -> b.getBranch().getId() + ":" + b.getMedicine().getId()));
        return byBranchAndMedicine.values().stream()
                .map(group -> {
                    Batch first = group.get(0);
                    int stock = group.stream().mapToInt(Batch::getQuantityAvailable).sum();
                    return new LowStockAlertDto(first.getMedicine().getId(), first.getMedicine().getName(),
                            first.getBranch().getName(), first.getMedicine().getReorderLevel(), stock);
                })
                .filter(a -> a.currentStock() < a.reorderLevel())
                .sorted((a, b) -> Integer.compare(a.currentStock(), b.currentStock()))
                .toList();
    }

    // ---------------- Stock transfers ----------------

    public StockTransferDto transferStock(Organization organization, CreateStockTransferRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        Branch from = resolveBranch(organization, request.fromBranchId());
        Branch to = resolveBranch(organization, request.toBranchId());
        if (from.getId().equals(to.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source and destination branch must be different.");
        }

        StockTransfer transfer = new StockTransfer();
        transfer.setOrganization(organization);
        transfer.setFromBranch(from);
        transfer.setToBranch(to);
        transfer.setTransferNumber(numberSeriesService.next(organization, "STOCK_TRANSFER", "TRF", ResetPolicy.YEARLY, 6));

        for (StockTransferItemInput input : request.items()) {
            Medicine medicine = catalogService.requireOwned(organization, input.medicineId());
            StockTransferItem item = new StockTransferItem();
            item.setMedicine(medicine);
            item.setQuantity(input.quantity());
            transfer.addItem(item);

            int remaining = input.quantity();
            for (Batch source : batchRepository.lockAllocatableBatches(medicine.getId(), from.getId(), LocalDate.now())) {
                if (remaining <= 0) break;
                int take = Math.min(remaining, source.getQuantityAvailable());
                source.setQuantityAvailable(source.getQuantityAvailable() - take);
                recordMovement(organization, from, medicine, source, StockMovementType.TRANSFER_OUT, -take, "STOCK_TRANSFER", null);

                Batch dest = new Batch();
                dest.setOrganization(organization);
                dest.setBranch(to);
                dest.setMedicine(medicine);
                dest.setSupplier(source.getSupplier());
                dest.setBatchNumber(source.getBatchNumber());
                dest.setExpiryDate(source.getExpiryDate());
                dest.setPurchasePrice(source.getPurchasePrice());
                dest.setMrp(source.getMrp());
                dest.setQuantityReceived(take);
                dest.setQuantityAvailable(take);
                dest = batchRepository.save(dest);
                recordMovement(organization, to, medicine, dest, StockMovementType.TRANSFER_IN, take, "STOCK_TRANSFER", null);

                remaining -= take;
            }
            if (remaining > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Not enough available stock of " + medicine.getName() + " at the source branch.");
            }
        }

        transfer = stockTransferRepository.save(transfer);
        return new StockTransferDto(transfer.getId(), transfer.getTransferNumber(), from.getName(), to.getName(), transfer.getCreatedAt(), transfer.getItems().size());
    }

    // ---------------- Stock adjustments (write-offs, count corrections) ----------------

    public StockLedgerEntryDto adjustStock(Organization organization, CreateStockAdjustmentRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        if (request.quantityChange() == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The quantity change can't be zero.");
        }
        Batch batch = batchRepository.findById(request.batchId())
                .filter(b -> b.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + request.batchId()));
        int newAvailable = batch.getQuantityAvailable() + request.quantityChange();
        if (newAvailable < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only " + batch.getQuantityAvailable() + " unit(s) of this batch are available to write off.");
        }
        batch.setQuantityAvailable(newAvailable);
        return toDto(recordMovement(organization, batch.getBranch(), batch.getMedicine(), batch,
                StockMovementType.ADJUSTMENT, request.quantityChange(), "STOCK_ADJUSTMENT", null, request.reason()));
    }

    @Transactional(readOnly = true)
    public List<StockLedgerEntryDto> listAdjustments(Organization organization, Long branchId) {
        accessService.requireModuleEnabled(organization, ModuleGroup.PHARMACY);
        return ledgerRepository.findByOrganizationIdAndBranchIdAndTypeOrderByCreatedAtDesc(organization.getId(), branchId, StockMovementType.ADJUSTMENT)
                .stream().map(this::toDto).toList();
    }

    private StockLedgerEntryDto toDto(StockLedgerEntry e) {
        return new StockLedgerEntryDto(e.getId(), e.getMedicine().getName(), e.getBatch() != null ? e.getBatch().getBatchNumber() : null,
                e.getType().name(), e.getQuantity(), e.getBalanceAfter(), e.getReferenceType(), e.getNote(),
                e.getCreatedBy() != null ? e.getCreatedBy().getFullName() : null, e.getCreatedAt());
    }

    // ---------------- Shared ledger writer ----------------

    /** quantity is signed: positive for stock coming in, negative for stock going out. */
    void recordMovement(Organization organization, Branch branch, Medicine medicine, Batch batch,
                         StockMovementType type, int quantity, String referenceType, Long referenceId) {
        recordMovement(organization, branch, medicine, batch, type, quantity, referenceType, referenceId, null);
    }

    private StockLedgerEntry recordMovement(Organization organization, Branch branch, Medicine medicine, Batch batch,
                         StockMovementType type, int quantity, String referenceType, Long referenceId, String note) {
        int newBalance = batchRepository.findByMedicineIdAndBranchIdOrderByExpiryDateAsc(medicine.getId(), branch.getId())
                .stream().mapToInt(Batch::getQuantityAvailable).sum();
        StockLedgerEntry entry = new StockLedgerEntry();
        entry.setOrganization(organization);
        entry.setBranch(branch);
        entry.setMedicine(medicine);
        entry.setBatch(batch);
        entry.setType(type);
        entry.setQuantity(quantity);
        entry.setBalanceAfter(newBalance);
        entry.setReferenceType(referenceType);
        entry.setReferenceId(referenceId);
        entry.setNote(note);
        entry.setCreatedBy(currentUserService.require());
        return ledgerRepository.save(entry);
    }

    private Branch resolveBranch(Organization organization, Long branchId) {
        if (branchId != null) {
            return branchRepository.findById(branchId)
                    .filter(b -> b.getOrganization().getId().equals(organization.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch does not belong to this organization."));
        }
        return branchRepository.findByOrganizationId(organization.getId()).stream()
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Organization has no branches yet."));
    }

    private PurchaseOrderDto toDto(PurchaseOrder po) {
        List<PurchaseOrderItemDto> items = po.getItems().stream()
                .map(i -> new PurchaseOrderItemDto(i.getId(), i.getMedicine().getName(), i.getQuantityOrdered(), i.getQuantityReceived(), i.getRate()))
                .toList();
        return new PurchaseOrderDto(po.getId(), po.getPoNumber(), po.getSupplier().getName(), po.getStatus().name(), po.getCreatedAt(), items);
    }
}
