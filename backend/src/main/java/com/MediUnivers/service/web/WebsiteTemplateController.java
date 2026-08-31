package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.SaveWebsiteTemplateRequest;
import com.MediUnivers.service.dto.WebsiteTemplateDto;
import com.MediUnivers.service.service.WebsiteTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * The template catalog for both audiences. Browsing is public (an org owner
 * needs it pre-publish, and it's shown before login too, e.g. during
 * signup); creating/editing/deactivating templates is super-admin only
 * (req #9).
 */
@RestController
@RequiredArgsConstructor
public class WebsiteTemplateController {

    private final WebsiteTemplateService templateService;

    @GetMapping("/api/public/website-templates")
    public List<WebsiteTemplateDto> listPublic(@RequestParam String audience) {
        return templateService.listForAudience(audience);
    }

    @GetMapping("/api/platform/website-templates")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
    public List<WebsiteTemplateDto> listAdmin() {
        return templateService.listAllForAdmin();
    }

    @PostMapping("/api/platform/website-templates")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public WebsiteTemplateDto create(@Valid @RequestBody SaveWebsiteTemplateRequest request) {
        return templateService.create(request);
    }

    @PutMapping("/api/platform/website-templates/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public WebsiteTemplateDto update(@PathVariable Long id, @Valid @RequestBody SaveWebsiteTemplateRequest request) {
        return templateService.update(id, request);
    }

    @DeleteMapping("/api/platform/website-templates/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        templateService.deactivate(id);
    }
}
