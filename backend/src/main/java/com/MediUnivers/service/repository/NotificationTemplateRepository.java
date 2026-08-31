package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.NotificationEventType;
import com.MediUnivers.service.domain.NotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, Long> {
    List<NotificationTemplate> findByOrganizationIdOrderByEventTypeAscChannelAsc(Long organizationId);

    Optional<NotificationTemplate> findByOrganizationIdAndEventTypeAndChannel(
            Long organizationId, NotificationEventType eventType, NotificationChannel channel);

    boolean existsByOrganizationId(Long organizationId);
}
