package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import com.esportshub.backend.support.Api;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

class LiveIngestIntegrationTest extends AbstractIntegrationTest {

    private static final String EXCHANGE = "esportshub.live";
    private static final String ROUTING_KEY = "match.agent.snapshot";
    private static final String DEAD_LETTER_QUEUE = "live.snapshots.dlq";
    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    @Autowired
    private RabbitTemplate rabbitTemplate;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String organizer;
    private String referee;
    private String captain;
    private long matchId;

    @BeforeEach
    void setUp() {
        long lol = api.gameId("LOL");
        organizer = api.register(unique("org"));
        long tournamentId = api.post("/api/tournaments", organizer, Map.of(
                "name", unique("Live "), "gameId", lol, "format", "SINGLE_ELIMINATION", "maxTeams", 2)).expect(201).id();
        api.post("/api/tournaments/" + tournamentId + "/approve", api.adminToken(), null).expect(200);

        for (int i = 0; i < 2; i++) {
            String teamCaptain = api.register(unique("kap"));
            long teamId = api.post("/api/teams", teamCaptain, Map.of("name", unique("Tim "), "tag", uniqueTag(), "gameId", lol))
                    .expect(201).id();
            api.post("/api/tournaments/" + tournamentId + "/registrations", teamCaptain, Map.of("teamId", teamId)).expect(201);
            captain = teamCaptain;
        }

        matchId = api.post("/api/tournaments/" + tournamentId + "/bracket", organizer, null).expect(201)
                .json().get("rounds").get(0).get("matches").get(0).get("id").asLong();

        String refereeName = unique("sudija");
        referee = api.register(refereeName);
        api.grantRole(refereeName, "REFEREE");
        api.put("/api/matches/" + matchId + "/referee", organizer, Map.of("username", refereeName)).expect(200);
    }

    @Test
    void matchKeyIsOnlyForMatchControllers() {
        String key = api.get("/api/matches/" + matchId + "/agent-key", referee).expect(200).json().get("matchKey").asString();

        assertThat(key).isNotBlank();
        assertThat(api.get("/api/matches/" + matchId + "/agent-key", organizer).expect(200).json().get("matchKey").asString())
                .isEqualTo(key);
        api.get("/api/matches/" + matchId + "/agent-key", captain).expect(403);
        api.get("/api/matches/" + matchId + "/agent-key", null).expect(401);

        Api.Response publicView = api.get("/api/matches/" + matchId, null).expect(200);
        assertThat(publicView.json().has("spectatorKey")).isFalse();
        assertThat(publicView.raw()).doesNotContain(key);
    }

    @Test
    void agentSnapshotIsStoredAndLateSnapshotGoesToDeadLetterQueue() {
        String key = agentKey();
        api.post("/api/matches/" + matchId + "/start", referee, null).expect(200);
        api.get("/api/matches/" + matchId + "/live", null).expect(204);

        publish(snapshot(key, 754));

        await().atMost(TIMEOUT).until(() -> api.get("/api/matches/" + matchId + "/live", null).status() == 200);
        JsonNode live = api.get("/api/matches/" + matchId + "/live", null).expect(200).json();
        assertThat(live.get("gameTimeSeconds").asInt()).isEqualTo(754);
        assertThat(live.get("killsA").asInt()).isEqualTo(10);
        assertThat(live.get("killsB").asInt()).isEqualTo(7);
        assertThat(live.get("towersA").asInt()).isEqualTo(2);
        assertThat(live.get("towersB").asInt()).isEqualTo(1);
        assertThat(live.get("goldA").isNull()).isTrue();
        assertThat(live.get("raw").get("dragonsA").asInt()).isEqualTo(2);

        assertThat(snapshotRows()).isEqualTo(1);
        assertThat(api.get("/api/matches/" + matchId + "/events", null).expect(200).raw()).doesNotContain("LIVE_SNAPSHOT");
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from match_events where match_id = ? and type = 'LIVE_SNAPSHOT'", Integer.class, matchId))
                .isZero();

        api.post("/api/matches/" + matchId + "/finish", referee, Map.of("scoreA", 1, "scoreB", 0)).expect(200);
        publish(snapshot(key, 800));

        Message dead = awaitDeadLetter(key);
        assertThat(new String(dead.getBody(), StandardCharsets.UTF_8)).contains("\"gameTimeSeconds\":800");
        assertThat(dead.getMessageProperties().getXDeathHeader()).isNotEmpty();
        assertThat(dead.getMessageProperties().getXDeathHeader().get(0).get("reason")).hasToString("rejected");
        assertThat(snapshotRows()).isEqualTo(1);
        assertThat(api.get("/api/matches/" + matchId + "/live", null).expect(200).json().get("gameTimeSeconds").asInt())
                .isEqualTo(754);
    }

    @Test
    void snapshotWithUnknownKeyGoesToDeadLetterQueue() {
        api.post("/api/matches/" + matchId + "/start", referee, null).expect(200);
        Integer rowsBefore = jdbcTemplate.queryForObject("select count(*) from live_game_snapshots", Integer.class);
        String unknownKey = "nepostojeci-" + UUID.randomUUID();

        publish(snapshot(unknownKey, 60));

        awaitDeadLetter(unknownKey);
        assertThat(jdbcTemplate.queryForObject("select count(*) from live_game_snapshots", Integer.class)).isEqualTo(rowsBefore);
        api.get("/api/matches/" + matchId + "/live", null).expect(204);
    }

    private String agentKey() {
        return api.get("/api/matches/" + matchId + "/agent-key", referee).expect(200).json().get("matchKey").asString();
    }

    private Map<String, Object> snapshot(String key, int gameTime) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("matchKey", key);
        snapshot.put("capturedAt", Instant.now().toString());
        snapshot.put("gameTimeSeconds", gameTime);
        snapshot.put("killsA", 10);
        snapshot.put("killsB", 7);
        snapshot.put("goldA", null);
        snapshot.put("goldB", null);
        snapshot.put("towersA", 2);
        snapshot.put("towersB", 1);
        snapshot.put("raw", Map.of("dragonsA", 2, "dragonsB", 1));
        return snapshot;
    }

    private void publish(Map<String, Object> snapshot) {
        Message message = MessageBuilder.withBody(jsonMapper.writeValueAsBytes(snapshot))
                .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                .setContentEncoding("UTF-8")
                .build();
        assertThat(message.getMessageProperties().getHeaders()).doesNotContainKey("__TypeId__");
        rabbitTemplate.send(EXCHANGE, ROUTING_KEY, message);
    }

    private Message awaitDeadLetter(String key) {
        AtomicReference<Message> found = new AtomicReference<>();
        await().atMost(TIMEOUT).until(() -> {
            Message message = rabbitTemplate.receive(DEAD_LETTER_QUEUE, 500);
            if (message != null && new String(message.getBody(), StandardCharsets.UTF_8).contains(key)) {
                found.set(message);
            }
            return found.get() != null;
        });
        return found.get();
    }

    private int snapshotRows() {
        return jdbcTemplate.queryForObject("select count(*) from live_game_snapshots where match_id = ?", Integer.class, matchId);
    }
}
