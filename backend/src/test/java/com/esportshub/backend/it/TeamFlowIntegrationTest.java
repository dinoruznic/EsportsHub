package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TeamFlowIntegrationTest extends AbstractIntegrationTest {

    private long lol;
    private long cs2;
    private String captain;
    private String teamName;
    private String tag;
    private long teamId;

    @BeforeEach
    void setUp() {
        lol = api.gameId("LOL");
        cs2 = api.gameId("CS2");
        captain = api.register(unique("kap"));
        teamName = unique("Tim ");
        tag = uniqueTag();
        teamId = api.post("/api/teams", captain, Map.of("name", teamName, "tag", tag, "gameId", lol, "region", "EUW"))
                .expect(201).id();
    }

    @Test
    void createdTeamIsPublicWithCaptainAndNoMembers() {
        JsonNode team = api.get("/api/teams/" + teamId, null).expect(200).json();

        assertThat(team.get("team").get("name").asString()).isEqualTo(teamName);
        assertThat(team.get("team").get("tag").asString()).isEqualTo(tag);
        assertThat(team.get("team").get("region").asString()).isEqualTo("EUW");
        assertThat(team.get("team").get("memberCount").asInt()).isZero();
        assertThat(team.get("members")).isEmpty();

        List<Long> lolTeams = new ArrayList<>();
        api.get("/api/teams?gameId=" + lol, null).expect(200).json().forEach(t -> lolTeams.add(t.get("id").asLong()));
        assertThat(lolTeams).contains(teamId);
    }

    @Test
    void duplicateNameOrTagIsConflict() {
        String other = api.register(unique("kap"));

        api.post("/api/teams", other, Map.of("name", teamName, "tag", uniqueTag(), "gameId", lol)).expect(409);
        api.post("/api/teams", other, Map.of("name", unique("Tim "), "tag", tag, "gameId", lol)).expect(409);
    }

    @Test
    void captainManagesRoster() {
        long accountId = account(lol);

        JsonNode member = api.post("/api/teams/" + teamId + "/members", captain,
                Map.of("gameAccountId", accountId, "roleInTeam", "STARTER")).expect(201).json();
        assertThat(member.get("roleInTeam").asString()).isEqualTo("STARTER");
        assertThat(api.get("/api/teams/" + teamId, null).json().get("members")).hasSize(1);

        api.post("/api/teams/" + teamId + "/members", captain, Map.of("gameAccountId", accountId)).expect(409);

        api.delete("/api/teams/" + teamId + "/members/" + member.get("membershipId").asLong(), captain).expect(204);
        JsonNode team = api.get("/api/teams/" + teamId, null).expect(200).json();
        assertThat(team.get("members")).isEmpty();
        assertThat(team.get("team").get("memberCount").asInt()).isZero();
    }

    @Test
    void accountOfAnotherGameCannotJoin() {
        api.post("/api/teams/" + teamId + "/members", captain, Map.of("gameAccountId", account(cs2))).expect(400);
    }

    @Test
    void onlyCaptainChangesRoster() {
        long accountId = account(lol);
        String stranger = api.register(unique("stranac"));

        api.post("/api/teams/" + teamId + "/members", stranger, Map.of("gameAccountId", accountId)).expect(403);

        long membershipId = api.post("/api/teams/" + teamId + "/members", captain, Map.of("gameAccountId", accountId))
                .expect(201).json().get("membershipId").asLong();
        api.delete("/api/teams/" + teamId + "/members/" + membershipId, stranger).expect(403);
    }

    private long account(long gameId) {
        String player = api.register(unique("igrac"));
        return api.post("/api/me/game-accounts", player, Map.of("gameId", gameId, "inGameName", unique("p")))
                .expect(201).id();
    }
}
