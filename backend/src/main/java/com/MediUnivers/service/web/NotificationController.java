package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.NotificationStatus;
import com.MediUnivers.service.dto.NotificationDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/** Notification Logs (spec §20) — every send attempt this organization has made, across every channel. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/org/notifications")
@PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<NotificationDto> list(@RequestParam(required = false) String status,
                                       @RequestParam(required = false) String channel,
                                       @RequestParam(required = false, defaultValue = "100") int limit) {
        NotificationStatus statusFilter = parse(status, NotificationStatus.class, "status");
        NotificationChannel channelFilter = parse(channel, NotificationChannel.class, "channel");
        return notificationService.list(requireOrgUser().getOrganization(), statusFilter, channelFilter, limit);
    }

    private <E extends Enum<E>> E parse(String raw, Class<E> type, String field) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Enum.valueOf(type, raw.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown " + field + ": " + raw);
        }
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
