package com.esportshub.backend.gameaccount;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class GameAccountController {

    private final GameAccountService gameAccountService;

    @PostMapping("/api/me/game-accounts")
    public ResponseEntity<GameAccountResponse> create(@AuthenticationPrincipal UserDetails principal,
                                                      @Valid @RequestBody CreateGameAccountRequest request) {
        GameAccountResponse created = gameAccountService.create(principal.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/api/me/game-accounts")
    public List<GameAccountResponse> listMine(@AuthenticationPrincipal UserDetails principal) {
        return gameAccountService.listMine(principal.getUsername());
    }
}
