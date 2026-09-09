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

    @PutMapping("/api/me/game-accounts/{id}")
    public GameAccountResponse update(@AuthenticationPrincipal UserDetails principal,
                                      @PathVariable Long id,
                                      @Valid @RequestBody UpdateGameAccountRequest request) {
        return gameAccountService.update(principal.getUsername(), id, request);
    }

    @DeleteMapping("/api/me/game-accounts/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id) {
        gameAccountService.delete(principal.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/players/{username}/game-accounts")
    public List<GameAccountResponse> listByUsername(@PathVariable String username) {
        return gameAccountService.listByUsername(username);
    }
}
