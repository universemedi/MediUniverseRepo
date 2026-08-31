package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.SupportTicket;
import com.MediUnivers.service.dto.CreateSupportTicketRequest;
import com.MediUnivers.service.dto.SupportTicketDto;
import com.MediUnivers.service.dto.UpdateSupportTicketRequest;
import com.MediUnivers.service.repository.AppUserRepository;
import com.MediUnivers.service.repository.OrganizationRepository;
import com.MediUnivers.service.repository.SupportTicketRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SupportTicketService {

    private final SupportTicketRepository repository;
    private final OrganizationRepository organizationRepository;
    private final AppUserRepository appUserRepository;

    public List<SupportTicketDto> listAll() {
        return repository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(SupportTicketService::toDto).toList();
    }

    @Transactional
    public SupportTicketDto create(CreateSupportTicketRequest request) {
        SupportTicket t = new SupportTicket();
        t.setSubject(request.subject());
        if (request.organizationId() != null) {
            Organization org = organizationRepository.findById(request.organizationId())
                    .orElseThrow(() -> new EntityNotFoundException("Organization not found: " + request.organizationId()));
            t.setOrganization(org);
        }
        t.setPriority(request.priority());
        if (request.ownerId() != null) {
            AppUser owner = appUserRepository.findById(request.ownerId())
                    .orElseThrow(() -> new EntityNotFoundException("Staff member not found: " + request.ownerId()));
            t.setOwner(owner);
        }
        return toDto(repository.save(t));
    }

    @Transactional
    public SupportTicketDto update(Long id, UpdateSupportTicketRequest request) {
        SupportTicket t = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found: " + id));
        t.setPriority(request.priority());
        if (request.ownerId() != null) {
            AppUser owner = appUserRepository.findById(request.ownerId())
                    .orElseThrow(() -> new EntityNotFoundException("Staff member not found: " + request.ownerId()));
            t.setOwner(owner);
        } else {
            t.setOwner(null);
        }
        t.setStatus(request.status());
        return toDto(repository.save(t));
    }

    private static SupportTicketDto toDto(SupportTicket t) {
        return new SupportTicketDto(t.getId(), "TCK-" + String.format("%05d", t.getId()), t.getSubject(),
                t.getOrganization() != null ? t.getOrganization().getId() : null,
                t.getOrganization() != null ? t.getOrganization().getName() : null,
                t.getPriority(),
                t.getOwner() != null ? t.getOwner().getId() : null,
                t.getOwner() != null ? t.getOwner().getFullName() : null,
                t.getStatus(), t.getCreatedAt());
    }
}
