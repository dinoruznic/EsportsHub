package com.esportshub.backend.live;

import com.esportshub.backend.match.MatchActor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class LiveController {

    private final LiveSimulatorService liveSimulatorService;

    @PostMapping("/{id}/simulate-snapshot")
    public ResponseEntity<LiveSnapshotMessage> simulate(@AuthenticationPrincipal UserDetails principal,
                                                        @PathVariable Long id) {
        return ResponseEntity.accepted().body(liveSimulatorService.simulate(MatchActor.from(principal), id));
    }
}
