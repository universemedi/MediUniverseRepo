package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.Lead;
import com.MediUnivers.service.dto.LeadRequest;
import com.MediUnivers.service.repository.LeadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Every public-website form (Contact, Request Demo, Free Trial, Pricing
 * Enquiry) funnels into this one lead system, per the product spec — no
 * separate databases or lead pipelines per form.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class LeadService {

    private final LeadRepository leadRepository;

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
        lead.setMessage(request.message());
        lead.setStatus("NEW_LEAD");
        return leadRepository.save(lead).getId();
    }
}
