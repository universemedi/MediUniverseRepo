package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.AuditLog;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.dto.AuditLogDto;
import com.MediUnivers.service.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Records privileged actions for the platform/audit-logs screen. Wired into a
 * representative set of high-value mutations (plan/org-type catalog changes,
 * platform staff changes) rather than every write endpoint in the app —
 * broader coverage can be added incrementally without changing this shape.
 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository repository;

    @Transactional
    public void record(AppUser actor, String action, String entityType, String entityId, Organization organization) {
        AuditLog log = new AuditLog();
        log.setActor(actor);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setOrganization(organization);
        repository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AuditLogDto> listRecent() {
        return repository.findTop200ByOrderByCreatedAtDesc().stream().map(AuditLogService::toDto).toList();
    }

    private static AuditLogDto toDto(AuditLog l) {
        return new AuditLogDto(l.getId(), l.getActor() != null ? l.getActor().getFullName() : "System",
                l.getAction(), l.getEntityType(), l.getEntityId(),
                l.getOrganization() != null ? l.getOrganization().getId() : null,
                l.getOrganization() != null ? l.getOrganization().getName() : null,
                l.getIpAddress(), l.getCreatedAt());
    }
}
