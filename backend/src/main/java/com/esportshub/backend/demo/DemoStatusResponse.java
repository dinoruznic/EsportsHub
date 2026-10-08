package com.esportshub.backend.demo;

import java.time.Instant;

public record DemoStatusResponse(
        boolean running,
        Long tournamentId,
        long liveMatches,
        long snapshotsSent,
        Instant startedAt
) {
}
