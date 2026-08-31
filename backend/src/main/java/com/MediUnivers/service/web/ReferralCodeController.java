package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.CreateReferralCodeRequest;
import com.MediUnivers.service.dto.ReferralCodeDto;
import com.MediUnivers.service.dto.UpdateReferralCodeRequest;
import com.MediUnivers.service.service.ReferralCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Referral programme codes — visible to Sales Lead (already seeded for platform/referrals), mutation restricted to the same. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/referrals")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class ReferralCodeController {

    private final ReferralCodeService service;

    @GetMapping
    public List<ReferralCodeDto> list() {
        return service.listAll();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_SALES_LEAD'))")
    public ReferralCodeDto create(@Valid @RequestBody CreateReferralCodeRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_SALES_LEAD'))")
    public ReferralCodeDto update(@PathVariable Long id, @Valid @RequestBody UpdateReferralCodeRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_SALES_LEAD'))")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        service.deactivate(id);
    }
}
