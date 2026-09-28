package com.esportshub.backend.match;

import com.esportshub.backend.bracket.MatchView;

import java.time.Instant;
import java.util.Map;

public record TournamentTopicMessage(
        String type,
        Long matchId,
        String actor,
        MatchView match,
        Map<String, Object> data,
        Instant at
) {
}
