package com.MediUnivers.service.notification;

import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.PlatformCommunicationSettings;
import com.MediUnivers.service.domain.PlatformNotification;

/** {@link NotificationChannelSender}'s platform-scoped counterpart — same contract, MediUnivers' own settings instead of an organization's. */
public interface PlatformNotificationChannelSender {

    NotificationChannel channel();

    ChannelSendResult send(PlatformCommunicationSettings settings, PlatformNotification notification);
}
