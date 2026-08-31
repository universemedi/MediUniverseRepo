package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.CreateSupportTicketRequest;
import com.MediUnivers.service.dto.SupportTicketDto;
import com.MediUnivers.service.dto.UpdateSupportTicketRequest;
import com.MediUnivers.service.service.SupportTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Customer support queue — visible to Support Agent (already seeded for platform/support). No delete: tickets are closed, never removed. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/support")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class SupportTicketController {

    private final SupportTicketService service;

    @GetMapping
    public List<SupportTicketDto> list() {
        return service.listAll();
    }

    @PostMapping
    public SupportTicketDto create(@Valid @RequestBody CreateSupportTicketRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public SupportTicketDto update(@PathVariable Long id, @Valid @RequestBody UpdateSupportTicketRequest request) {
        return service.update(id, request);
    }
}
