package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.PharmacyQueueItemDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.PharmacyQueueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class PharmacyQueueController {

    private final PharmacyQueueService queueService;
    private final CurrentUserService currentUserService;

    @GetMapping("/api/pharmacy/queue")
    public List<PharmacyQueueItemDto> pending() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return queueService.pending(me.getOrganization());
    }
}
