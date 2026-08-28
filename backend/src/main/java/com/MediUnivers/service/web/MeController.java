package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.MeResponse;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MeController {

    private final CurrentUserService currentUserService;
    private final UserService userService;

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
}
