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

class RefereeAssignmentIntegrationTest extends AbstractIntegrationTest {

    private String admin;
    private long lol;
    private String organizerName;
    private String organizer;

    @BeforeEach
    void setUp() {
        admin = api.adminToken();
        lol = api.gameId("LOL");
        organizerName = unique("dodorg");
        organizer = api.registerOrganizer(organizerName);
    }

    @Test
    void generatingTheBracketAssignsTheLeastLoadedRefereeWithoutConflict() {
        String suffix = unique("");
        String playingReferee = "aaa" + suffix + "1";
        String freeReferee = "aaa" + suffix + "2";
        String playingToken = referee(playingReferee);
        referee(freeReferee);

        long tournamentId = openTournament();
        List<String> teamNames = new ArrayList<>();
        teamNames.add(registerTeam(tournamentId, playingToken));
        for (int i = 0; i < 3; i++) {
            teamNames.add(registerTeam(tournamentId, api.register(unique("dodkap"))));
        }

        JsonNode bracket = api.post("/api/tournaments/" + tournamentId + "/bracket", organizer, null).expect(201).json();
        JsonNode semifinals = bracket.get("rounds").get(0).get("matches");
        JsonNode withPlayingReferee = semifinals.get(0);
        JsonNode other = semifinals.get(1);
        assertThat(withPlayingReferee.get("teamA").get("name").asString()).isEqualTo(teamNames.get(0));
        assertThat(withPlayingReferee.get("refereeUsername").asString()).isEqualTo(freeReferee);
        assertThat(other.get("refereeUsername").asString()).isEqualTo(playingReferee);
        assertThat(bracket.get("rounds").get(1).get("matches").get(0).get("refereeUsername").isNull()).isTrue();

        long matchId = withPlayingReferee.get("id").asLong();
        JsonNode assigned = events(matchId).stream()
                .filter(event -> event.get("type").asString().equals("REFEREE_ASSIGNED"))
                .findFirst().orElseThrow();
        assertThat(assigned.get("actor").asString()).isEqualTo("SISTEM");
        assertThat(assigned.get("source").asString()).isEqualTo("SISTEM");
        assertThat(assigned.get("data").get("referee").asString()).isEqualTo(freeReferee);
        assertThat(assigned.get("data").get("automatic").asBoolean()).isTrue();

        JsonNode conflict = api.put("/api/matches/" + matchId + "/referee", organizer, Map.of("username", playingReferee))
                .expect(409).json();
        assertThat(conflict.get("message").asString())
                .isEqualTo("Sudija je clan tima " + teamNames.get(0) + " i ne moze suditi ovaj mec");
        assertThat(api.get("/api/matches/" + matchId, null).expect(200).json().get("refereeUsername").asString())
                .isEqualTo(freeReferee);

        long finalId = bracket.get("rounds").get(1).get("matches").get(0).get("id").asLong();
        assertThat(api.put("/api/matches/" + finalId + "/referee", admin, Map.of("username", freeReferee))
                .expect(200).json().get("refereeUsername").asString()).isEqualTo(freeReferee);
    }

    @Test
    void winnerAdvancingFillsTheFinalAndAssignsAReferee() {
        String suffix = unique("");
        String firstReferee = "aab" + suffix + "1";
        String secondReferee = "aab" + suffix + "2";
        referee(firstReferee);
        referee(secondReferee);

        long tournamentId = openTournament();
        for (int i = 0; i < 4; i++) {
            registerTeam(tournamentId, api.register(unique("dodkap")));
        }
        JsonNode bracket = api.post("/api/tournaments/" + tournamentId + "/bracket", organizer, null).expect(201).json();
        long semifinal1 = bracket.get("rounds").get(0).get("matches").get(0).get("id").asLong();
        long semifinal2 = bracket.get("rounds").get(0).get("matches").get(1).get("id").asLong();
        long finalId = bracket.get("rounds").get(1).get("matches").get(0).get("id").asLong();

        play(semifinal1);
        assertThat(api.get("/api/matches/" + finalId, null).expect(200).json().get("refereeUsername").isNull()).isTrue();
        play(semifinal2);

        JsonNode finalMatch = api.get("/api/matches/" + finalId, null).expect(200).json();
        assertThat(finalMatch.get("teamB").isNull()).isFalse();
        assertThat(finalMatch.get("refereeUsername").asString()).isEqualTo(firstReferee);
        assertThat(events(finalId)).singleElement().satisfies(event -> {
            assertThat(event.get("type").asString()).isEqualTo("REFEREE_ASSIGNED");
            assertThat(event.get("actor").asString()).isEqualTo("SISTEM");
        });
    }

    @Test
    void organizerCannotRegisterOwnTeamToOwnTournament() {
        long tournamentId = openTournament();
        long ownTeam = api.post("/api/teams", organizer, Map.of(
                "name", unique("Org tim "),
                "tag", uniqueTag(),
                "gameId", lol)).expect(201).id();

        JsonNode error = api.post("/api/tournaments/" + tournamentId + "/registrations", organizer,
                Map.of("teamId", ownTeam)).expect(409).json();
        assertThat(error.get("message").asString()).isEqualTo("Organizator ne moze prijaviti svoj tim na svoj turnir");
    }

    private String referee(String username) {
        String token = api.register(username);
        api.grantRole(username, "REFEREE");
        return token;
    }

    private long openTournament() {
        long tournamentId = api.post("/api/tournaments", organizer, Map.of(
                "name", unique("Fer kup "),
                "gameId", lol,
                "format", "SINGLE_ELIMINATION",
                "maxTeams", 4)).expect(201).id();
        api.post("/api/tournaments/" + tournamentId + "/approve", admin, null).expect(200);
        return tournamentId;
    }

    private String registerTeam(long tournamentId, String captain) {
        String name = unique("Fer tim ");
        long teamId = api.post("/api/teams", captain, Map.of("name", name, "tag", uniqueTag(), "gameId", lol))
                .expect(201).id();
        api.post("/api/tournaments/" + tournamentId + "/registrations", captain, Map.of("teamId", teamId)).expect(201);
        return name;
    }

    private void play(long matchId) {
        api.post("/api/matches/" + matchId + "/start", organizer, null).expect(200);
        api.post("/api/matches/" + matchId + "/finish", organizer, Map.of("scoreA", 2, "scoreB", 0)).expect(200);
    }

    private List<JsonNode> events(long matchId) {
        return StreamSupport.stream(api.get("/api/matches/" + matchId + "/events", null).expect(200).json().spliterator(), false)
                .toList();
    }
}
