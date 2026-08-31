package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.NotificationTemplateDto;
import com.MediUnivers.service.dto.UpsertNotificationTemplateRequest;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.NotificationTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Template Engine, per organization (spec §7-8) — every message an org sends is edited here, not in Java code. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/org/communication/templates")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class NotificationTemplateController {

    private final NotificationTemplateService templateService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<NotificationTemplateDto> list() {
        return templateService.list(requireOrgUser().getOrganization());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
    public NotificationTemplateDto update(@PathVariable Long id, @Valid @RequestBody UpsertNotificationTemplateRequest request) {
        return templateService.update(requireOrgUser().getOrganization(), id, request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
