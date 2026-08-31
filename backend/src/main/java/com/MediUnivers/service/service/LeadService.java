package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.Lead;
import com.MediUnivers.service.domain.LeadStatus;
import com.MediUnivers.service.dto.LeadDto;
import com.MediUnivers.service.dto.LeadRequest;
import com.MediUnivers.service.repository.AppUserRepository;
import com.MediUnivers.service.repository.LeadRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/**
 * Every public-website form (Contact, Request Demo, Free Trial, Pricing
 * Enquiry) funnels into this one lead system, per the product spec — no
 * separate databases or lead pipelines per form. Platform sales staff then
 * work the pipeline here (req #2's "standard CRM process").
 */
@Service
@RequiredArgsConstructor
@Transactional
public class LeadService {

    private final LeadRepository leadRepository;
    private final AppUserRepository appUserRepository;

    public Long capture(LeadRequest request) {
        Lead lead = new Lead();
        lead.setSource(request.source());
        lead.setName(request.name());
        lead.setEmail(request.email());
        lead.setPhone(request.phone());
        lead.setOrganizationName(request.organizationName());
        lead.setOrganizationType(request.organizationType());
        lead.setCity(request.city());
        lead.setExpectedBranches(request.expectedBranches());
        lead.setExpectedUsers(request.expectedUsers());
        lead.setModulesOfInterest(request.modulesOfInterest());
        lead.setPreferredDemoDate(request.preferredDemoDate());
        lead.setMessage(request.message());
        lead.setStatus(LeadStatus.NEW_LEAD);
        return leadRepository.save(lead).getId();
    }

    @Transactional(readOnly = true)
    public List<LeadDto> listAll() {
        return leadRepository.findAllByOrderByCreatedAtDesc().stream().map(DtoMapper::toDto).toList();
    }

    public LeadDto updateStatus(Long id, String status) {
        Lead lead = requireLead(id);
        try {
            lead.setStatus(LeadStatus.valueOf(status.toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown lead status: " + status);
        }
        return DtoMapper.toDto(leadRepository.save(lead));
    }

    public LeadDto assign(Long id, Long userId) {
        Lead lead = requireLead(id);
        if (userId == null) {
            lead.setAssignedTo(null);
        } else {
            AppUser user = appUserRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found: " + userId));
            lead.setAssignedTo(user);
        }
        return DtoMapper.toDto(leadRepository.save(lead));
    }

    public LeadDto addNote(Long id, String note) {
        Lead lead = requireLead(id);
        String existing = lead.getInternalNotes();
        lead.setInternalNotes(existing == null || existing.isBlank() ? note : existing + "\n---\n" + note);
        return DtoMapper.toDto(leadRepository.save(lead));
    }

    private Lead requireLead(Long id) {
        return leadRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Lead not found: " + id));
    }
}
