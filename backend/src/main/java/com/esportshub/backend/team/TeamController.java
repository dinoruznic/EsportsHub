package com.esportshub.backend.team;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping("")
    public ResponseEntity<TeamResponse> create(@AuthenticationPrincipal UserDetails principal,
                                               @Valid @RequestBody CreateTeamRequest request) {
        TeamResponse created = teamService.create(principal.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("")
    public List<TeamResponse> listTeams(@RequestParam(required = false) Long gameId) {
        return teamService.listTeams(gameId);
    }

    @GetMapping("/{id}")
    public TeamDetailResponse getTeam(@PathVariable Long id) {
        return teamService.getTeam(id);
    }
}
