package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.PlatformCommunicationSettingsDto;
import com.MediUnivers.service.dto.PlatformNotificationDto;
import com.MediUnivers.service.dto.TestSendNotificationRequest;
import com.MediUnivers.service.dto.UpdatePlatformCommunicationSettingsRequest;
import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.service.PlatformNotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** MediUnivers' own outgoing email/SMS settings — {@link OrganizationCommunicationController}'s platform-scoped twin. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/communication")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
public class PlatformCommunicationController {

    private final PlatformNotificationService platformNotificationService;

    @GetMapping("/settings")
    public PlatformCommunicationSettingsDto getSettings() {
        return platformNotificationService.getSettingsDto();
    }

    @PutMapping("/settings")
    public PlatformCommunicationSettingsDto updateSettings(@Valid @RequestBody UpdatePlatformCommunicationSettingsRequest request) {
        return platformNotificationService.updateSettings(request);
    }

    @PostMapping("/test-send")
    public Map<String, String> testSend(@Valid @RequestBody TestSendNotificationRequest request) {
        NotificationChannel channel = NotificationChannel.valueOf(request.channel());
        return Map.of("message", platformNotificationService.sendTest(channel, request.destination()));
    }

    @GetMapping("/log")
    public List<PlatformNotificationDto> log(@RequestParam(defaultValue = "50") int limit) {
        return platformNotificationService.list(limit);
    }
}
