package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.OnboardingStepDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.OnboardingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/org/onboarding")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class OnboardingController {

    private final OnboardingService onboardingService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<OnboardingStepDto> checklist() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return onboardingService.checklist(me.getOrganization());
    }
}
