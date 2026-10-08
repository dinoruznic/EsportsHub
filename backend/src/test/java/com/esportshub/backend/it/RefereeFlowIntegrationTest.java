package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

class RefereeFlowIntegrationTest extends AbstractIntegrationTest {

    @Test
    void organizersSeeRefereesAndRefereesSeeTheirMatches() {
        String admin = api.adminToken();
        long lol = api.gameId("LOL");
        String organizerName = unique("sudorg");
        String organizer = api.register(organizerName);
        String refereeName = unique("sudija");
        String referee = api.register(refereeName);
        String stranger = api.register(unique("stranac"));

        api.get("/api/referees", stranger).expect(403);
        api.get("/api/referees", null).expect(401);
        api.get("/api/me/referee-matches", null).expect(401);

        long tournamentId = api.post("/api/tournaments", organizer, Map.of(
                "name", unique("Sudijski kup "),
                "gameId", lol,
                "format", "SINGLE_ELIMINATION",
                "maxTeams", 4)).expect(201).id();
        api.post("/api/tournaments/" + tournamentId + "/approve", admin, null).expect(200);
        for (int i = 0; i < 4; i++) {
            String captain = api.register(unique("sudkap"));
            long teamId = api.post("/api/teams", captain, Map.of(
                    "name", unique("Sudijski tim "),
                    "tag", uniqueTag(),
                    "gameId", lol)).expect(201).id();
            api.post("/api/tournaments/" + tournamentId + "/registrations", captain, Map.of("teamId", teamId)).expect(201);
        }
        JsonNode bracket = api.post("/api/tournaments/" + tournamentId + "/bracket", organizer, null).expect(201).json();
        long semifinal = bracket.get("rounds").get(0).get("matches").get(0).get("id").asLong();
        long finalId = bracket.get("rounds").get(1).get("matches").get(0).get("id").asLong();

        assertThat(usernames(api.get("/api/referees", organizer).expect(200).json())).doesNotContain(refereeName);
        api.grantRole(refereeName, "REFEREE");
        JsonNode referees = api.get("/api/referees", organizer).expect(200).json();
        assertThat(usernames(referees)).contains(refereeName);
        assertThat(usernames(api.get("/api/referees", admin).expect(200).json())).contains(refereeName);

        assertThat(api.get("/api/matches/" + semifinal, null).expect(200).json().get("refereeUsername").isNull()).isTrue();
        JsonNode assigned = api.put("/api/matches/" + semifinal + "/referee", organizer, Map.of("username", refereeName))
                .expect(200).json();
        assertThat(assigned.get("refereeUsername").asString()).isEqualTo(refereeName);
        assertThat(api.get("/api/matches/" + semifinal, null).expect(200).json().get("refereeUsername").asString())
                .isEqualTo(refereeName);
        api.put("/api/matches/" + finalId + "/referee", organizer, Map.of("username", refereeName)).expect(200);

        List<JsonNode> mine = list(api.get("/api/me/referee-matches", referee).expect(200).json());
        assertThat(mine).extracting(m -> m.get("matchId").asLong()).containsExactlyInAnyOrder(semifinal, finalId);
        JsonNode first = mine.stream().filter(m -> m.get("matchId").asLong() == semifinal).findFirst().orElseThrow();
        assertThat(first.get("status").asString()).isEqualTo("SCHEDULED");
        assertThat(first.get("tournamentId").asLong()).isEqualTo(tournamentId);
        assertThat(first.get("gameCode").asString()).isEqualTo("LOL");
        assertThat(first.get("roundName").asString()).isEqualTo("Polufinale");
        assertThat(first.get("teamA").get("name").asString()).isNotBlank();
        assertThat(first.get("refereeUsername").asString()).isEqualTo(refereeName);
        assertThat(first.get("lastSnapshotAt").isNull()).isTrue();

        api.post("/api/matches/" + semifinal + "/start", referee, null).expect(200);
        api.post("/api/matches/" + semifinal + "/simulate-snapshot", referee, null).expect(202);
        await().atMost(Duration.ofSeconds(15)).until(() -> list(api.get("/api/me/referee-matches", referee).expect(200).json())
                .stream()
                .anyMatch(m -> m.get("matchId").asLong() == semifinal && !m.get("lastSnapshotAt").isNull()));

        assertThat(list(api.get("/api/me/referee-matches", admin).expect(200).json()))
                .anyMatch(m -> m.get("matchId").asLong() == semifinal && m.get("status").asString().equals("LIVE"));
        assertThat(list(api.get("/api/me/referee-matches", stranger).expect(200).json())).isEmpty();
    }

    private static List<JsonNode> list(JsonNode array) {
        return StreamSupport.stream(array.spliterator(), false).toList();
    }

    private static List<String> usernames(JsonNode array) {
        return list(array).stream().map(node -> node.get("username").asString()).toList();
    }
}
