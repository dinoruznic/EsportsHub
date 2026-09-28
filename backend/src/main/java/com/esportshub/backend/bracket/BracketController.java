package com.esportshub.backend.bracket;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tournaments/{id}/bracket")
@RequiredArgsConstructor
public class BracketController {

    private final BracketService bracketService;

    @PostMapping("")
    public ResponseEntity<BracketResponse> generate(@AuthenticationPrincipal UserDetails principal,
                                                    Authentication authentication,
                                                    @PathVariable Long id) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
        BracketResponse created = bracketService.generate(principal.getUsername(), isAdmin, id);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("")
    public BracketResponse view(@PathVariable Long id) {
        return bracketService.view(id);
    }
}
