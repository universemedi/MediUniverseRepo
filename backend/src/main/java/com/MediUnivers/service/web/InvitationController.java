package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.AcceptInvitationRequest;
import com.MediUnivers.service.dto.InvitationPreviewDto;
import com.MediUnivers.service.service.UserInvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Public (unauthenticated) endpoints for the invitation-acceptance page —
 * someone clicking their invite link isn't signed in yet, that's the whole
 * point of the link.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public/invitations")
public class InvitationController {

    private final UserInvitationService invitationService;

    @GetMapping("/{token}")
    public InvitationPreviewDto preview(@PathVariable String token) {
        AppUser user = invitationService.previewInvitation(token);
        return new InvitationPreviewDto(user.getEmail(), user.getFullName(),
                user.getOrganization() != null ? user.getOrganization().getName() : "MediUnivers",
                user.getRole().getName(), user.getPortal().name());
    }

    @PostMapping("/{token}/accept")
    public void accept(@PathVariable String token, @Valid @RequestBody AcceptInvitationRequest request) {
        invitationService.accept(token, request.password());
    }
}
