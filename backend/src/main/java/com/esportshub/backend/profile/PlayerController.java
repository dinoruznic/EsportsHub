package com.esportshub.backend.profile;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/players")
@RequiredArgsConstructor
public class PlayerController {

    private final ProfileService profileService;

    @GetMapping("/{username}")
    public PlayerProfileResponse player(@PathVariable String username) {
        return profileService.player(username);
    }
}
