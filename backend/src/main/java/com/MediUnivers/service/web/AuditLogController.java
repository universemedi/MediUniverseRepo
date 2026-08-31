package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.AuditLogDto;
import com.MediUnivers.service.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Read-only — entries are written internally by AuditLogService, never through this API. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/audit-logs")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class AuditLogController {

    private final AuditLogService service;

    @GetMapping
    public List<AuditLogDto> list() {
        return service.listRecent();
    }
}
