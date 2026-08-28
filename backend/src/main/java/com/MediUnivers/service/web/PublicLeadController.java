package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.LeadRequest;
import com.MediUnivers.service.service.LeadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PublicLeadController {

    private final LeadService leadService;

    /** Contact, Request Demo, Free Trial and Pricing Enquiry all post here — one lead system. */
    @PostMapping("/api/public/leads")
    public ResponseEntity<Map<String, Object>> capture(@Valid @RequestBody LeadRequest request) {
        Long id = leadService.capture(request);
        return ResponseEntity.ok(Map.of("id", id, "status", "NEW_LEAD"));
    }
}
