package com.esportshub.backend.match;

import com.esportshub.backend.bracket.MatchView;

import java.time.Instant;

public record MatchTopicMessage(
        String type,
        String actor,
        MatchView match,
        Instant at
) {
}
