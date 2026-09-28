package com.esportshub.backend.match;

import tools.jackson.databind.JsonNode;

import java.time.Instant;

public record MatchEventResponse(
        Long id,
        Long matchId,
        String type,
        String source,
        String actor,
        JsonNode data,
        Instant createdAt
) {
}
