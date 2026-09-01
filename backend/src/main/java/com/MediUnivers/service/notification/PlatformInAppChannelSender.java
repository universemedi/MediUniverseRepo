package com.MediUnivers.service.notification;

import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.PlatformCommunicationSettings;
import com.MediUnivers.service.domain.PlatformNotification;
import org.springframework.stereotype.Service;

/** In-app notifications don't call out anywhere — the {@link PlatformNotification} row itself, once persisted, IS the stored notification a logged-in platform user sees in their header bell. "Sending" it is a no-op, same as {@link InAppChannelSender}'s org-scoped twin. */
@Service
public class PlatformInAppChannelSender implements PlatformNotificationChannelSender {

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.IN_APP;
    }

    @Override
    public ChannelSendResult send(PlatformCommunicationSettings settings, PlatformNotification notification) {
        return ChannelSendResult.ok();
    }
}
