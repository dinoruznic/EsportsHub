package com.esportshub.backend.bracket;

import java.util.Map;
import java.util.Set;

public enum MatchStatus {
    SCHEDULED,
    LIVE,
    FINISHED,
    CANCELLED;

    private static final Map<MatchStatus, Set<MatchStatus>> TRANSITIONS = Map.of(
            SCHEDULED, Set.of(LIVE, CANCELLED),
            LIVE, Set.of(FINISHED, CANCELLED),
            FINISHED, Set.of(),
            CANCELLED, Set.of());

    public boolean canTransitionTo(MatchStatus target) {
        return TRANSITIONS.get(this).contains(target);
    }
}
