package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class TournamentFlowIntegrationTest extends AbstractIntegrationTest {

    private long lol;
    private String organizerName;
    private String organizer;

    @BeforeEach
    void setUp() {
        lol = api.gameId("LOL");
        organizerName = unique("org");
        organizer = api.register(organizerName);
    }

    @Test
    void pendingTournamentIsHiddenUntilAdminApprovesIt() {
        long tournamentId = createTournament();
        String stranger = api.register(unique("stranac"));

        assertThat(publicTournamentIds()).doesNotContain(tournamentId);
        api.get("/api/tournaments/" + tournamentId, null).expect(404);
        api.get("/api/tournaments/" + tournamentId, stranger).expect(404);
        assertThat(api.get("/api/tournaments/" + tournamentId, organizer).expect(200).json().get("status").asString())
                .isEqualTo("PENDING");

        api.post("/api/tournaments/" + tournamentId + "/approve", organizer, null).expect(403);
        assertThat(api.post("/api/tournaments/" + tournamentId + "/approve", api.adminToken(), null).expect(200)
                .json().get("status").asString()).isEqualTo("REGISTRATION");
        assertThat(publicTournamentIds()).contains(tournamentId);
        api.post("/api/tournaments/" + tournamentId + "/approve", api.adminToken(), null).expect(409);

        long rejectedId = createTournament();
        assertThat(api.post("/api/tournaments/" + rejectedId + "/reject", api.adminToken(), null).expect(200)
                .json().get("status").asString()).isEqualTo("REJECTED");
        assertThat(publicTournamentIds()).doesNotContain(rejectedId);
    }

    @Test
    void tournamentGoesFromRegistrationToChampion() {
        String admin = api.adminToken();
        long tournamentId = createTournament();
        api.post("/api/tournaments/" + tournamentId + "/approve", admin, null).expect(200);

        List<String> captains = new ArrayList<>();
        List<Long> teams = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            String captain = api.register(unique("kap"));
            long teamId = team(captain, lol);
            api.post("/api/tournaments/" + tournamentId + "/registrations", captain, Map.of("teamId", teamId)).expect(201);
            captains.add(captain);
            teams.add(teamId);
        }

        JsonNode registrations = api.get("/api/tournaments/" + tournamentId + "/registrations", null).expect(200).json();
        assertThat(registrations).hasSize(4);
        assertThat(registrations).allSatisfy(r -> assertThat(r.get("status").asString()).isEqualTo("REGISTERED"));

        String cs2Captain = api.register(unique("kapCS"));
        api.post("/api/tournaments/" + tournamentId + "/registrations", cs2Captain,
                Map.of("teamId", team(cs2Captain, api.gameId("CS2")))).expect(400);
        api.post("/api/tournaments/" + tournamentId + "/registrations", captains.get(0),
                Map.of("teamId", teams.get(0))).expect(409);

        api.post("/api/tournaments/" + tournamentId + "/bracket", captains.get(0), null).expect(403);
        JsonNode bracket = api.post("/api/tournaments/" + tournamentId + "/bracket", organizer, null).expect(201).json();
        api.post("/api/tournaments/" + tournamentId + "/bracket", organizer, null).expect(409);

        assertThat(bracket.get("status").asString()).isEqualTo("ONGOING");
        JsonNode semifinals = bracket.get("rounds").get(0);
        JsonNode finalRound = bracket.get("rounds").get(1);
        assertThat(semifinals.get("name").asString()).isEqualTo("Polufinale");
        assertThat(finalRound.get("name").asString()).isEqualTo("Finale");
        assertThat(pair(semifinals.get("matches").get(0))).containsExactly(teams.get(0), teams.get(3));
        assertThat(pair(semifinals.get("matches").get(1))).containsExactly(teams.get(1), teams.get(2));
        JsonNode finalMatch = finalRound.get("matches").get(0);
        assertThat(finalMatch.get("teamA").isNull()).isTrue();
        assertThat(finalMatch.get("teamB").isNull()).isTrue();

        long semifinal1 = semifinals.get("matches").get(0).get("id").asLong();
        long semifinal2 = semifinals.get("matches").get(1).get("id").asLong();
        long finalId = finalMatch.get("id").asLong();

        String refereeName = unique("sudija");
        String referee = api.register(refereeName);
        api.put("/api/matches/" + semifinal1 + "/referee", organizer, Map.of("username", refereeName)).expect(400);
        api.grantRole(refereeName, "REFEREE");
        for (long matchId : List.of(semifinal1, semifinal2, finalId)) {
            api.put("/api/matches/" + matchId + "/referee", captains.get(0), Map.of("username", refereeName)).expect(403);
            api.put("/api/matches/" + matchId + "/referee", organizer, Map.of("username", refereeName)).expect(200);
        }

        api.post("/api/matches/" + semifinal1 + "/finish", referee, score(2, 1)).expect(409);
        api.post("/api/matches/" + finalId + "/start", referee, null).expect(409);
        api.post("/api/matches/" + semifinal1 + "/start", captains.get(0), null).expect(403);

        api.post("/api/matches/" + semifinal1 + "/start", referee, null).expect(200);
        api.post("/api/matches/" + semifinal1 + "/start", referee, null).expect(409);
        api.put("/api/matches/" + semifinal1 + "/score", referee, score(1, 0)).expect(200);
        api.post("/api/matches/" + semifinal1 + "/finish", referee, score(1, 1)).expect(400);
        assertThat(api.post("/api/matches/" + semifinal1 + "/finish", referee, score(2, 1)).expect(200)
                .json().get("winnerTeamId").asLong()).isEqualTo(teams.get(0));

        api.post("/api/matches/" + semifinal2 + "/start", referee, null).expect(200);
        assertThat(api.post("/api/matches/" + semifinal2 + "/finish", referee, score(0, 2)).expect(200)
                .json().get("winnerTeamId").asLong()).isEqualTo(teams.get(2));

        assertThat(pair(api.get("/api/matches/" + finalId, null).expect(200).json()))
                .containsExactly(teams.get(0), teams.get(2));
        assertThat(tournamentStatus(tournamentId)).isEqualTo("ONGOING");

        api.post("/api/matches/" + finalId + "/start", referee, null).expect(200);
        api.post("/api/matches/" + finalId + "/finish", referee, score(3, 1)).expect(200);
        api.post("/api/matches/" + finalId + "/finish", referee, score(3, 1)).expect(409);

        assertThat(tournamentStatus(tournamentId)).isEqualTo("COMPLETED");
        JsonNode finalView = api.get("/api/tournaments/" + tournamentId + "/bracket", null).expect(200)
                .json().get("rounds").get(1).get("matches").get(0);
        assertThat(finalView.get("status").asString()).isEqualTo("FINISHED");
        assertThat(finalView.get("winnerTeamId").asLong()).isEqualTo(teams.get(0));

        JsonNode events = api.get("/api/matches/" + finalId + "/events", null).expect(200).json();
        List<String> types = StreamSupport.stream(events.spliterator(), false).map(e -> e.get("type").asString()).toList();
        assertThat(types).containsExactly("REFEREE_ASSIGNED", "STARTED", "FINISHED", "TOURNAMENT_COMPLETED");
        JsonNode assigned = events.get(0);
        assertThat(assigned.get("actor").asString()).isEqualTo(organizerName);
        assertThat(assigned.get("source").asString()).isEqualTo("ORGANIZER");
        JsonNode completed = events.get(3);
        assertThat(completed.get("actor").asString()).isEqualTo(refereeName);
        assertThat(completed.get("source").asString()).isEqualTo("REFEREE");
        assertThat(completed.get("data").get("winnerTeamId").asLong()).isEqualTo(teams.get(0));
    }

    private long createTournament() {
        JsonNode tournament = api.post("/api/tournaments", organizer, Map.of(
                "name", unique("Kup "),
                "gameId", lol,
                "format", "SINGLE_ELIMINATION",
                "maxTeams", 8)).expect(201).json();
        assertThat(tournament.get("status").asString()).isEqualTo("PENDING");
        assertThat(tournament.get("organizerUsername").asString()).isEqualTo(organizerName);
        return tournament.get("id").asLong();
    }

    private long team(String captainToken, long gameId) {
        return api.post("/api/teams", captainToken, Map.of("name", unique("Tim "), "tag", uniqueTag(), "gameId", gameId))
                .expect(201).id();
    }

    private List<Long> publicTournamentIds() {
        return StreamSupport.stream(api.get("/api/tournaments", null).expect(200).json().spliterator(), false)
                .map(t -> t.get("id").asLong())
                .toList();
    }

    private String tournamentStatus(long tournamentId) {
        return api.get("/api/tournaments/" + tournamentId, null).expect(200).json().get("status").asString();
    }

    private static List<Long> pair(JsonNode match) {
        return List.of(match.get("teamA").get("id").asLong(), match.get("teamB").get("id").asLong());
    }

    private static Map<String, Integer> score(int a, int b) {
        return Map.of("scoreA", a, "scoreB", b);
    }
}
