package com.esportshub.backend.match;

import com.esportshub.backend.bracket.MatchView;

import java.time.Instant;

public record TournamentTopicMessage(
        String type,
        Long matchId,
        String actor,
        MatchView match,
        Instant at
) {
}
