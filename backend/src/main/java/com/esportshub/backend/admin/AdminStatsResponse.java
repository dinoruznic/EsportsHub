package com.esportshub.backend.admin;

import java.util.Map;

public record AdminStatsResponse(
        long users,
        long teams,
        Map<String, Long> tournamentsByStatus,
        long liveMatches,
        long openListings
) {
}
