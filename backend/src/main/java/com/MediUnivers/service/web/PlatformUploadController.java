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

/** Image uploads for the platform's own website content (testimonials, blog covers, team photos). */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/uploads")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_MARKETING'))")
public class PlatformUploadController {

    private final FileStorageService fileStorageService;

    @PostMapping
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) {
        return Map.of("url", fileStorageService.store(file));
    }
}
