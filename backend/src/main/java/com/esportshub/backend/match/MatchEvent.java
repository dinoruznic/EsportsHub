package com.esportshub.backend.match;

import java.util.Map;

public record MatchEvent(
        Long matchId,
        Long tournamentId,
        String type,
        String actor,
        Map<String, Object> data
) {
    public static final String REFEREE_ASSIGNED = "REFEREE_ASSIGNED";
    public static final String STARTED = "STARTED";
    public static final String SCORE_UPDATED = "SCORE_UPDATED";
    public static final String FINISHED = "FINISHED";
    public static final String WINNER_ADVANCED = "WINNER_ADVANCED";
    public static final String TOURNAMENT_COMPLETED = "TOURNAMENT_COMPLETED";
    public static final String LIVE_SNAPSHOT = "LIVE_SNAPSHOT";

    public static final String RIOT_AGENT = "riot-agent";
}
