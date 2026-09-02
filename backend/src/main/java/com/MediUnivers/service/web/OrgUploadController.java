package com.MediUnivers.service.web;

import com.MediUnivers.service.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/** Image/video uploads for an organization's own public website (logo, hero banners/video,
 * gallery) — same storage backend as the platform's own uploads, just a separate auth gate. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/org/uploads")
@PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MARKETING_MANAGER'))")
public class OrgUploadController {

    private final FileStorageService fileStorageService;

    @PostMapping
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) {
        return Map.of("url", fileStorageService.store(file));
    }
}
