package com.esportshub.backend.match;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class RefereeController {

    private final RefereeService refereeService;

    @GetMapping("/api/me/referee-matches")
    public List<RefereeMatchResponse> myMatches(@AuthenticationPrincipal UserDetails principal) {
        return refereeService.myMatches(MatchActor.from(principal));
    }

    @GetMapping("/api/referees")
    public List<RefereeResponse> referees(@AuthenticationPrincipal UserDetails principal) {
        return refereeService.referees(MatchActor.from(principal));
    }
}
