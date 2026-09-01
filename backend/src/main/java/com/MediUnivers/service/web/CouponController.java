package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.CouponDto;
import com.MediUnivers.service.dto.CreateCouponRequest;
import com.MediUnivers.service.dto.ShareCouponRequest;
import com.MediUnivers.service.dto.UpdateCouponRequest;
import com.MediUnivers.service.service.CouponService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Promotional discount codes — viewing open to Sales Lead + Finance (already seeded), mutation restricted to those same roles. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/coupons")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class CouponController {

    private final CouponService service;

    @GetMapping
    public List<CouponDto> list() {
        return service.listAll();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_SALES_LEAD') or hasAuthority('ROLE_PLATFORM_FINANCE'))")
    public CouponDto create(@Valid @RequestBody CreateCouponRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_SALES_LEAD') or hasAuthority('ROLE_PLATFORM_FINANCE'))")
    public CouponDto update(@PathVariable Long id, @Valid @RequestBody UpdateCouponRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_SALES_LEAD') or hasAuthority('ROLE_PLATFORM_FINANCE'))")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        service.deactivate(id);
    }

    @PostMapping("/{id}/share")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_SALES_LEAD') or hasAuthority('ROLE_PLATFORM_FINANCE'))")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void share(@PathVariable Long id, @Valid @RequestBody ShareCouponRequest request) {
        service.share(id, request);
    }
}
