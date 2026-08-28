package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.LabReportDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.LabReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class LabReportController {

    private final LabReportService reportService;
    private final CurrentUserService currentUserService;

    @GetMapping("/api/lab/reports/{orderId}")
    public LabReportDto report(@PathVariable Long orderId) {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return reportService.report(me.getOrganization(), orderId);
    }
}
