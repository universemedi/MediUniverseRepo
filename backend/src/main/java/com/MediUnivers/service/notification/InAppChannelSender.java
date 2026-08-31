package com.MediUnivers.service.notification;

import com.MediUnivers.service.domain.Notification;
import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.OrganizationCommunicationSettings;
import org.springframework.stereotype.Service;

/**
 * In-app notifications (spec §11) don't call out anywhere — the
 * {@link Notification} row itself, once persisted, IS the stored
 * notification a logged-in user sees after login. "Sending" it is a no-op.
 */
@Service
public class InAppChannelSender implements NotificationChannelSender {

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.IN_APP;
    }

    @Override
    public ChannelSendResult send(OrganizationCommunicationSettings settings, Notification notification) {
        return ChannelSendResult.ok();
    }
}
