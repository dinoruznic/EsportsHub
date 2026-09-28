package com.esportshub.agent;

import java.time.Instant;
import java.util.Map;

public record LiveSnapshotMessage(
        String matchKey,
        Instant capturedAt,
        Integer gameTimeSeconds,
        Integer killsA,
        Integer killsB,
        Integer goldA,
        Integer goldB,
        Integer towersA,
        Integer towersB,
        Map<String, Object> raw
) {
}
