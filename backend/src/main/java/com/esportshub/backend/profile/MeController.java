package com.esportshub.backend.profile;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final ProfileService profileService;

    @GetMapping("")
    public MeResponse me(@AuthenticationPrincipal UserDetails principal) {
        return profileService.me(principal.getUsername());
    }

    @PutMapping("")
    public MeResponse update(@AuthenticationPrincipal UserDetails principal,
                             @Valid @RequestBody UpdateMeRequest request) {
        return profileService.updateMe(principal.getUsername(), request);
    }
}
