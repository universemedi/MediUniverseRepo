package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.ChangePasswordRequest;
import com.MediUnivers.service.dto.MeResponse;
import com.MediUnivers.service.dto.MyNotificationDto;
import com.MediUnivers.service.dto.MyProfileDto;
import com.MediUnivers.service.dto.UpdateMyProfileRequest;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.NotificationService;
import com.MediUnivers.service.service.PlatformNotificationService;
import com.MediUnivers.service.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class MeController {

    private final CurrentUserService currentUserService;
    private final UserService userService;
    private final NotificationService notificationService;
    private final PlatformNotificationService platformNotificationService;

    /**
     * The frontend calls this right after the OAuth2 code exchange to hydrate
     * Redux with the real, backend-issued identity — role, organization,
     * plan, org type, branch — replacing what used to be picked by hand on
     * the login screen.
     */
    @GetMapping("/api/me")
    public MeResponse me() {
        return userService.toMeResponse(currentUserService.require());
    }

    /** Any logged-in user, any portal, editing their own name/email/phone/date of birth. */
    @GetMapping("/api/me/profile")
    public MyProfileDto myProfile() {
        return userService.getOwnProfile(currentUserService.require());
    }

    @PutMapping("/api/me/profile")
    public MyProfileDto updateMyProfile(@Valid @RequestBody UpdateMyProfileRequest request) {
        return userService.updateOwnProfile(currentUserService.require(), request);
    }

    @PostMapping("/api/me/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changeOwnPassword(currentUserService.require(), request);
    }

    /** The header bell — works for any logged-in user, any portal; routes to whichever notification engine actually owns their account. */
    @GetMapping("/api/me/notifications")
    public List<MyNotificationDto> myNotifications(@RequestParam(defaultValue = "20") int limit) {
        AppUser me = currentUserService.require();
        return me.getOrganization() != null
                ? notificationService.listMine(me.getId(), limit)
                : platformNotificationService.listMine(me.getId(), limit);
    }

    @GetMapping("/api/me/notifications/unread-count")
    public Map<String, Long> unreadCount() {
        AppUser me = currentUserService.require();
        long count = me.getOrganization() != null
                ? notificationService.countMineUnread(me.getId())
                : platformNotificationService.countMineUnread(me.getId());
        return Map.of("count", count);
    }

    @PostMapping("/api/me/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markNotificationRead(@PathVariable Long id) {
        AppUser me = currentUserService.require();
        if (me.getOrganization() != null) notificationService.markMineRead(me.getId(), id);
        else platformNotificationService.markMineRead(me.getId(), id);
    }

    @PostMapping("/api/me/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllNotificationsRead() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() != null) notificationService.markAllMineRead(me.getId());
        else platformNotificationService.markAllMineRead(me.getId());
    }
}
