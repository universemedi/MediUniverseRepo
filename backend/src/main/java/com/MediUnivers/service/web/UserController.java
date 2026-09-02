package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.CreateUserRequest;
import com.MediUnivers.service.dto.MeResponse;
import com.MediUnivers.service.dto.OrgUserDto;
import com.MediUnivers.service.dto.UpdateUserRequest;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/org/users")
@PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN'))")
public class UserController {

    private final UserService userService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<OrgUserDto> list() {
        AppUser me = requireOrgUser();
        return userService.listForOrganization(me.getOrganization().getId());
    }

    @PostMapping
    public MeResponse create(@Valid @RequestBody CreateUserRequest request) {
        AppUser me = requireOrgUser();
        return userService.createOrgUser(me.getOrganization(), request);
    }

    @PutMapping("/{id}")
    public OrgUserDto update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        AppUser me = requireOrgUser();
        return userService.updateOrgUser(me.getOrganization(), id, request);
    }

    @PostMapping("/{id}/resend-invitation")
    public MeResponse resendInvitation(@PathVariable Long id) {
        AppUser me = requireOrgUser();
        return userService.resendInvitation(me.getOrganization(), id);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
