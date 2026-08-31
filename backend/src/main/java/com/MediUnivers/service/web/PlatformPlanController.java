package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.CreatePlanRequest;
import com.MediUnivers.service.dto.PlanDto;
import com.MediUnivers.service.dto.UpdatePlanRequest;
import com.MediUnivers.service.service.PlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Subscription plan catalog management — deliberately restricted to
 * ROLE_SUPER_ADMIN only for every mutation (req #8), unlike most platform
 * resources which also open up to a relevant specialist role (Finance,
 * Sales Lead, etc.). Viewing stays open to any platform staff for now.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/plans")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class PlatformPlanController {

    private final PlanService planService;

    @GetMapping
    public List<PlanDto> list() {
        return planService.listAllForAdmin();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public PlanDto create(@Valid @RequestBody CreatePlanRequest request) {
        return planService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public PlanDto update(@PathVariable Long id, @Valid @RequestBody UpdatePlanRequest request) {
        return planService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        planService.deactivate(id);
    }
}
