package com.esportshub.backend.tournament;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments")
@RequiredArgsConstructor
public class TournamentController {

    private final TournamentService tournamentService;

    @PostMapping("")
    public ResponseEntity<TournamentResponse> create(@AuthenticationPrincipal UserDetails principal,
                                                     @Valid @RequestBody CreateTournamentRequest request) {
        TournamentResponse created = tournamentService.create(principal.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("")
    public List<TournamentResponse> listPublic() {
        return tournamentService.listPublic();
    }

    @GetMapping("/{id}")
    public TournamentResponse getOne(@PathVariable Long id, Authentication authentication) {
        return tournamentService.getOne(id, authentication);
    }
}
