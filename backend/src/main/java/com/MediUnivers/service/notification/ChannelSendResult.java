package com.MediUnivers.service.notification;

/** What a channel sender hands back after attempting delivery. */
public record ChannelSendResult(boolean success, String errorMessage) {

    public static ChannelSendResult ok() {
        return new ChannelSendResult(true, null);
    }

    public static ChannelSendResult failed(String errorMessage) {
        return new ChannelSendResult(false, errorMessage);
    }
}
