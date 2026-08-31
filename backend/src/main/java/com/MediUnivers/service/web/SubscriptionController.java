package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.SubscriptionDto;
import com.MediUnivers.service.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Read-only visibility for platform staff — subscriptions change via the signup/payment/cron flows, not manual admin edits. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/subscriptions")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping
    public List<SubscriptionDto> list() {
        return subscriptionService.listAll();
    }

    @GetMapping("/trials")
    public List<SubscriptionDto> trials() {
        return subscriptionService.listActiveTrials();
    }
}
