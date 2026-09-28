package com.esportshub.backend.match;

import com.esportshub.backend.bracket.MatchView;

import java.time.Instant;
import java.util.Map;

public record MatchTopicMessage(
        String type,
        String actor,
        MatchView match,
        Map<String, Object> data,
        Instant at
) {
}
