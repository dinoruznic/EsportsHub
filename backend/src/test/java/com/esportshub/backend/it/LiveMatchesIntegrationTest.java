package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class LiveMatchesIntegrationTest extends AbstractIntegrationTest {

    @Test
    void liveListShowsLiveMatchesAndUpcomingMatchesWithBothTeams() {
        String admin = api.adminToken();
        String organizer = api.register(unique("liveorg"));
        long lol = api.gameId("LOL");
        String name = unique("Uzivo kup ");

        long tournamentId = api.post("/api/tournaments", organizer, Map.of(
                "name", name,
                "gameId", lol,
                "format", "SINGLE_ELIMINATION",
                "maxTeams", 4)).expect(201).id();
        api.post("/api/tournaments/" + tournamentId + "/approve", admin, null).expect(200);

        for (int i = 0; i < 4; i++) {
            String captain = api.register(unique("livekap"));
            long teamId = api.post("/api/teams", captain, Map.of(
                    "name", unique("Live tim "),
                    "tag", uniqueTag(),
                    "gameId", lol)).expect(201).id();
            api.post("/api/tournaments/" + tournamentId + "/registrations", captain, Map.of("teamId", teamId)).expect(201);
        }

        JsonNode bracket = api.post("/api/tournaments/" + tournamentId + "/bracket", organizer, null).expect(201).json();
        long liveId = bracket.get("rounds").get(0).get("matches").get(0).get("id").asLong();
        long finalId = bracket.get("rounds").get(1).get("matches").get(0).get("id").asLong();
        api.post("/api/matches/" + liveId + "/start", organizer, null).expect(200);
        api.put("/api/matches/" + liveId + "/score", organizer, Map.of("scoreA", 1, "scoreB", 0)).expect(200);

        List<JsonNode> matches = StreamSupport.stream(api.get("/api/matches/live", null).expect(200).json().spliterator(), false)
                .toList();

        JsonNode live = matches.stream().filter(m -> m.get("matchId").asLong() == liveId).findFirst().orElseThrow();
        assertThat(live.get("status").asString()).isEqualTo("LIVE");
        assertThat(live.get("tournamentId").asLong()).isEqualTo(tournamentId);
        assertThat(live.get("tournamentName").asString()).isEqualTo(name);
        assertThat(live.get("gameCode").asString()).isEqualTo("LOL");
        assertThat(live.get("roundName").asString()).isEqualTo("Polufinale");
        assertThat(live.get("scoreA").asInt()).isEqualTo(1);
        assertThat(live.get("teamA").get("name").asString()).isNotBlank();
        assertThat(live.get("teamB").get("name").asString()).isNotBlank();
        assertThat(live.get("startedAt").isNull()).isFalse();

        assertThat(matches).noneMatch(m -> m.get("matchId").asLong() == finalId);
        assertThat(matches).allSatisfy(m -> assertThat(m.get("status").asString()).isIn("LIVE", "SCHEDULED"));
        List<JsonNode> upcoming = matches.stream().filter(m -> "SCHEDULED".equals(m.get("status").asString())).toList();
        assertThat(upcoming).hasSizeLessThanOrEqualTo(10);
        assertThat(upcoming).allSatisfy(m -> {
            assertThat(m.get("teamA").isNull()).isFalse();
            assertThat(m.get("teamB").isNull()).isFalse();
        });
        int firstUpcoming = matches.indexOf(upcoming.isEmpty() ? null : upcoming.get(0));
        assertThat(matches.indexOf(live)).isLessThan(firstUpcoming < 0 ? Integer.MAX_VALUE : firstUpcoming);
    }
}
