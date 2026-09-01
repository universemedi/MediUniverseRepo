package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.PlatformNotificationTemplateDto;
import com.MediUnivers.service.dto.UpsertPlatformNotificationTemplateRequest;
import com.MediUnivers.service.service.PlatformNotificationTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Editable wording for MediUnivers' own platform-origin events — {@link NotificationTemplateController}'s platform-scoped twin. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/communication/templates")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
public class PlatformNotificationTemplateController {

    private final PlatformNotificationTemplateService templateService;

    @GetMapping
    public List<PlatformNotificationTemplateDto> list() {
        return templateService.list();
    }

    @PutMapping("/{id}")
    public PlatformNotificationTemplateDto update(@PathVariable Long id, @Valid @RequestBody UpsertPlatformNotificationTemplateRequest request) {
        return templateService.update(id, request);
    }
}
