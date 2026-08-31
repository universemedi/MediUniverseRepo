package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.ForgotPasswordRequest;
import com.MediUnivers.service.dto.ResetPasswordRequest;
import com.MediUnivers.service.service.AuthPasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The two endpoints the frontend's forgot/reset-password pages already call. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public/auth")
public class AuthPasswordResetController {

    private final AuthPasswordResetService authPasswordResetService;

    @PostMapping("/forgot-password")
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authPasswordResetService.requestReset(request.email());
    }

    @PostMapping("/reset-password")
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authPasswordResetService.resetPassword(request.token(), request.newPassword());
    }
}
