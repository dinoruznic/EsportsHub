package com.esportshub.backend.live;

import tools.jackson.databind.JsonNode;

import java.time.Instant;

public record LiveSnapshotResponse(
        Long matchId,
        Instant capturedAt,
        Integer gameTimeSeconds,
        Integer killsA,
        Integer killsB,
        Integer goldA,
        Integer goldB,
        Integer towersA,
        Integer towersB,
        JsonNode raw
) {
}
