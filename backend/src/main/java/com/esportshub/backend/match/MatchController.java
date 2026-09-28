package com.esportshub.backend.match;

import com.esportshub.backend.bracket.MatchView;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;
    private final MatchEventLogger matchEventLogger;

    @PutMapping("/{id}/referee")
    public MatchView assignReferee(@AuthenticationPrincipal UserDetails principal,
                                   @PathVariable Long id,
                                   @Valid @RequestBody AssignRefereeRequest request) {
        return matchService.assignReferee(actor(principal), id, request);
    }

    @PostMapping("/{id}/start")
    public MatchView start(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id) {
        return matchService.start(actor(principal), id);
    }

    @PutMapping("/{id}/score")
    public MatchView updateScore(@AuthenticationPrincipal UserDetails principal,
                                 @PathVariable Long id,
                                 @Valid @RequestBody ScoreRequest request) {
        return matchService.updateScore(actor(principal), id, request);
    }

    @PostMapping("/{id}/finish")
    public MatchView finish(@AuthenticationPrincipal UserDetails principal,
                            @PathVariable Long id,
                            @Valid @RequestBody ScoreRequest request) {
        return matchService.finish(actor(principal), id, request);
    }

    @GetMapping("/{id}")
    public MatchView get(@PathVariable Long id) {
        return matchService.get(id);
    }

    @GetMapping("/{id}/agent-key")
    public AgentKeyResponse agentKey(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id) {
        return matchService.agentKey(actor(principal), id);
    }

    @GetMapping("/{id}/events")
    public List<MatchEventResponse> events(@PathVariable Long id) {
        return matchEventLogger.findByMatch(id);
    }

    private static MatchActor actor(UserDetails principal) {
        boolean isAdmin = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
        return new MatchActor(principal.getUsername(), isAdmin);
    }
}
