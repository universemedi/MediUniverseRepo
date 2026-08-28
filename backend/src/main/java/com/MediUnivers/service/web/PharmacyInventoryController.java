package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.PharmacyInventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_PHARMACIST'))")
public class PharmacyInventoryController {

    private final PharmacyInventoryService inventoryService;
    private final CurrentUserService currentUserService;

    @GetMapping("/api/pharmacy/purchase-orders")
    public List<PurchaseOrderDto> listPurchaseOrders() {
        return inventoryService.listPurchaseOrders(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/pharmacy/purchase-orders")
    public PurchaseOrderDto createPurchaseOrder(@Valid @RequestBody CreatePurchaseOrderRequest request) {
        return inventoryService.createPurchaseOrder(requireOrgUser().getOrganization(), request);
    }

    @PostMapping("/api/pharmacy/goods-receipts")
    public GoodsReceiptDto receiveGoods(@Valid @RequestBody CreateGoodsReceiptRequest request) {
        return inventoryService.receiveGoods(requireOrgUser().getOrganization(), request);
    }

    @GetMapping("/api/pharmacy/medicines/{medicineId}/batches")
    public List<BatchDto> listBatches(@PathVariable Long medicineId, @RequestParam Long branchId) {
        return inventoryService.listBatches(requireOrgUser().getOrganization(), medicineId, branchId);
    }

    @GetMapping("/api/pharmacy/stock/low")
    public List<LowStockDto> lowStock(@RequestParam Long branchId) {
        return inventoryService.lowStock(requireOrgUser().getOrganization(), branchId);
    }

    @GetMapping("/api/pharmacy/stock/expiring")
    public List<ExpiringBatchDto> expiringSoon(@RequestParam(value = "withinDays", defaultValue = "30") int withinDays) {
        return inventoryService.expiringSoon(requireOrgUser().getOrganization(), withinDays);
    }

    @PostMapping("/api/pharmacy/stock-transfers")
    public StockTransferDto transferStock(@Valid @RequestBody CreateStockTransferRequest request) {
        return inventoryService.transferStock(requireOrgUser().getOrganization(), request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
