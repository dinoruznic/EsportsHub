package com.esportshub.backend.match;

import com.esportshub.backend.bracket.MatchView;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
        return matchService.assignReferee(MatchActor.from(principal), id, request);
    }

    @PostMapping("/{id}/start")
    public MatchView start(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id) {
        return matchService.start(MatchActor.from(principal), id);
    }

    @PutMapping("/{id}/score")
    public MatchView updateScore(@AuthenticationPrincipal UserDetails principal,
                                 @PathVariable Long id,
                                 @Valid @RequestBody ScoreRequest request) {
        return matchService.updateScore(MatchActor.from(principal), id, request);
    }

    @PostMapping("/{id}/finish")
    public MatchView finish(@AuthenticationPrincipal UserDetails principal,
                            @PathVariable Long id,
                            @Valid @RequestBody ScoreRequest request) {
        return matchService.finish(MatchActor.from(principal), id, request);
    }

    @GetMapping("/{id}")
    public MatchView get(@PathVariable Long id) {
        return matchService.get(id);
    }

    @GetMapping("/{id}/agent-key")
    public AgentKeyResponse agentKey(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id) {
        return matchService.agentKey(MatchActor.from(principal), id);
    }

    @GetMapping("/{id}/events")
    public List<MatchEventResponse> events(@PathVariable Long id) {
        return matchEventLogger.findByMatch(id);
    }
}
