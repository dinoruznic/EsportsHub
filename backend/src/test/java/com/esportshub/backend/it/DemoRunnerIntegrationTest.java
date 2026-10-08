package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractDemoIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

class DemoRunnerIntegrationTest extends AbstractDemoIntegrationTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(60);

    @AfterEach
    void stopDemo() {
        api.post("/api/admin/demo/stop", api.adminToken(), null).expect(200);
    }

    @Test
    void onlyAdminsControlTheDemo() {
        String player = api.register(unique("igrac"));

        api.get("/api/admin/demo/status", null).expect(401);
        api.get("/api/admin/demo/status", player).expect(403);
        api.post("/api/admin/demo/start", player, null).expect(403);
        api.post("/api/admin/demo/stop", player, null).expect(403);
    }

    @Test
    void demoStartsMatchesAndSendsSnapshotsThroughRabbit() {
        String admin = api.adminToken();
        api.post("/api/admin/demo/reset", admin, null).expect(200);
        long openId = tournamentId("Sarajevo Open");

        JsonNode idle = api.get("/api/admin/demo/status", admin).expect(200).json();
        assertThat(idle.get("running").asBoolean()).isFalse();

        JsonNode started = api.post("/api/admin/demo/start", admin, null).expect(200).json();
        assertThat(started.get("running").asBoolean()).isTrue();
        assertThat(started.get("tournamentId").asLong()).isEqualTo(openId);
        assertThat(started.get("startedAt").isNull()).isFalse();

        await().atMost(TIMEOUT).until(() -> liveMatchIds(openId).size() == 2);
        long matchId = liveMatchIds(openId).getFirst();
        await().atMost(TIMEOUT).until(() -> api.get("/api/matches/" + matchId + "/live", null).status() == 200);

        JsonNode snapshot = api.get("/api/matches/" + matchId + "/live", null).json();
        assertThat(snapshot.get("gameTimeSeconds").asInt()).isGreaterThan(14 * 60);
        assertThat(snapshot.get("raw").get("demo").asBoolean()).isTrue();

        JsonNode startedEvent = stream(api.get("/api/matches/" + matchId + "/events", null).expect(200).json())
                .filter(event -> event.get("type").asString().equals("STARTED"))
                .findFirst()
                .orElseThrow();
        assertThat(startedEvent.get("source").asString()).isEqualTo("DEMO");
        assertThat(startedEvent.get("actor").asString()).isEqualTo("DEMO");

        JsonNode running = api.get("/api/admin/demo/status", admin).expect(200).json();
        assertThat(running.get("snapshotsSent").asLong()).isPositive();

        JsonNode stopped = api.post("/api/admin/demo/stop", admin, null).expect(200).json();
        assertThat(stopped.get("running").asBoolean()).isFalse();
        assertThat(stopped.get("startedAt").isNull()).isTrue();
        long sent = stopped.get("snapshotsSent").asLong();
        await().pollDelay(Duration.ofMillis(800)).atMost(TIMEOUT).until(() -> true);
        assertThat(api.get("/api/admin/demo/status", admin).json().get("snapshotsSent").asLong()).isEqualTo(sent);
    }

    @Test
    void demoPlaysTheTournamentToTheEndAndStops() {
        String admin = api.adminToken();
        api.post("/api/admin/demo/reset", admin, null).expect(200);
        long openId = tournamentId("Sarajevo Open");

        api.post("/api/admin/demo/start", admin, Map.of("tournamentId", openId)).expect(200);

        await().atMost(TIMEOUT).until(() -> !api.get("/api/admin/demo/status", admin).json().get("running").asBoolean());

        JsonNode bracket = api.get("/api/tournaments/" + openId + "/bracket", null).expect(200).json();
        assertThat(bracket.get("status").asString()).isEqualTo("COMPLETED");
        JsonNode rounds = bracket.get("rounds");
        JsonNode semifinal = rounds.get(1).get("matches").get(0);
        assertThat(Math.max(semifinal.get("scoreA").asInt(), semifinal.get("scoreB").asInt())).isEqualTo(2);
        JsonNode finalMatch = rounds.get(2).get("matches").get(0);
        assertThat(finalMatch.get("status").asString()).isEqualTo("FINISHED");
        assertThat(Math.max(finalMatch.get("scoreA").asInt(), finalMatch.get("scoreB").asInt())).isEqualTo(3);
        assertThat(finalMatch.get("refereeUsername").isNull()).isFalse();
        assertThat(api.get("/api/matches/" + finalMatch.get("id").asLong() + "/events", null).json())
                .extracting(event -> event.get("type").asString())
                .contains("REFEREE_ASSIGNED", "STARTED", "FINISHED", "TOURNAMENT_COMPLETED");

        assertThat(api.post("/api/admin/demo/start", admin, null).expect(409).message())
                .isEqualTo("Nema turnira u toku za demo");
        assertThat(api.post("/api/admin/demo/start", admin, Map.of("tournamentId", openId)).expect(409).message())
                .isEqualTo("Turnir nije u toku");
        api.post("/api/admin/demo/start", admin, Map.of("tournamentId", 999999)).expect(404);
    }

    private long tournamentId(String name) {
        return stream(api.get("/api/tournaments", null).expect(200).json())
                .filter(tournament -> tournament.get("name").asString().equals(name))
                .findFirst()
                .orElseThrow()
                .get("id").asLong();
    }

    private List<Long> liveMatchIds(long tournamentId) {
        return stream(api.get("/api/matches/live", null).expect(200).json())
                .filter(match -> match.get("tournamentId").asLong() == tournamentId)
                .filter(match -> match.get("status").asString().equals("LIVE"))
                .map(match -> match.get("matchId").asLong())
                .toList();
    }

    private static Stream<JsonNode> stream(JsonNode node) {
        return StreamSupport.stream(node.spliterator(), false);
    }
}
