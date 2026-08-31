package com.MediUnivers.service.notification;

import com.MediUnivers.service.domain.Notification;
import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.OrganizationCommunicationSettings;

/**
 * Everything the Communication Engine needs from a delivery channel (spec
 * §24 "Providers are configurable"). Email is the first implementation
 * ({@link EmailChannelSender}); adding another channel or provider means
 * writing one more class that implements this interface and registering it
 * as a Spring bean — NotificationService, and every business module that
 * sends through it, stay untouched.
 *
 * Spring auto-collects every bean implementing this interface into a
 * Map&lt;NotificationChannel, NotificationChannelSender&gt; keyed by {@link #channel()},
 * which is how NotificationService dispatches a queued notification without
 * any registry/factory boilerplate (mirrors PaymentGatewayService in the
 * payment package).
 */
public interface NotificationChannelSender {

    NotificationChannel channel();

    /**
     * Attempt delivery using this organization's provider configuration.
     * Must never throw for an ordinary delivery failure (bad address, provider
     * error, timeout) — return a failed {@link ChannelSendResult} instead so
     * the queue can log it and retry; only truly unexpected errors should escape.
     */
    ChannelSendResult send(OrganizationCommunicationSettings settings, Notification notification);
}
