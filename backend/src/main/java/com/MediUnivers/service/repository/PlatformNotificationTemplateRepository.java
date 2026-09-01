package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.PlatformNotificationEventType;
import com.MediUnivers.service.domain.PlatformNotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlatformNotificationTemplateRepository extends JpaRepository<PlatformNotificationTemplate, Long> {
    List<PlatformNotificationTemplate> findAllByOrderByEventTypeAscChannelAsc();

    Optional<PlatformNotificationTemplate> findByEventTypeAndChannel(
            PlatformNotificationEventType eventType, NotificationChannel channel);
}
