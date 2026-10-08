package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ProfileFlowIntegrationTest extends AbstractIntegrationTest {

    @Test
    void ownProfileCanBeReadAndRenamed() {
        String username = unique("profil");
        String token = api.register(username);

        JsonNode me = api.get("/api/me", token).expect(200).json();
        assertThat(me.get("username").asString()).isEqualTo(username);
        assertThat(me.get("email").asString()).isEqualTo(username + "@it.local");
        assertThat(me.get("displayName").asString()).isEqualTo(username);
        assertThat(me.get("roles").get(0).asString()).isEqualTo("PLAYER");
        assertThat(me.get("createdAt").isNull()).isFalse();
        assertThat(me.get("id").asLong()).isPositive();

        JsonNode renamed = api.put("/api/me", token, Map.of("displayName", "  Novo Ime  ")).expect(200).json();
        assertThat(renamed.get("displayName").asString()).isEqualTo("Novo Ime");
        assertThat(api.get("/api/me", token).expect(200).json().get("displayName").asString()).isEqualTo("Novo Ime");

        assertThat(api.put("/api/me", token, Map.of("displayName", "   ")).expect(200).json()
                .get("displayName").asString()).isEqualTo(username);

        Map<String, Object> empty = new HashMap<>();
        empty.put("displayName", null);
        assertThat(api.put("/api/me", token, empty).expect(200).json().get("displayName").asString()).isEqualTo(username);

        api.put("/api/me", token, Map.of("displayName", "x".repeat(61))).expect(400);
        api.get("/api/me", null).expect(401);
        api.put("/api/me", null, Map.of("displayName", "Neko")).expect(401);
    }

    @Test
    void publicProfileShowsTeamsWithoutEmail() {
        long lol = api.gameId("LOL");
        String playerName = unique("igrac");
        String player = api.register(playerName);
        String captain = api.register(unique("kapiten"));

        long ownTeam = api.post("/api/teams", player, Map.of(
                "name", unique("Moj tim "),
                "tag", uniqueTag(),
                "gameId", lol)).expect(201).id();
        long otherTeam = api.post("/api/teams", captain, Map.of(
                "name", unique("Tudji tim "),
                "tag", uniqueTag(),
                "gameId", lol)).expect(201).id();
        long account = api.post("/api/me/game-accounts", player, Map.of(
                "gameId", lol,
                "inGameName", "igrac#EUW")).expect(201).id();
        api.post("/api/teams/" + otherTeam + "/members", captain, Map.of("gameAccountId", account)).expect(201);

        JsonNode profile = api.get("/api/players/" + playerName, null).expect(200).json();
        assertThat(profile.get("username").asString()).isEqualTo(playerName);
        assertThat(profile.get("displayName").asString()).isEqualTo(playerName);
        assertThat(profile.has("email")).isFalse();
        assertThat(profile.get("roles").get(0).asString()).isEqualTo("PLAYER");

        JsonNode teams = profile.get("teams");
        assertThat(teams).hasSize(2);
        for (JsonNode team : teams) {
            boolean captainFlag = team.get("captain").asBoolean();
            assertThat(team.get("gameCode").asString()).isEqualTo("LOL");
            if (team.get("id").asLong() == ownTeam) {
                assertThat(captainFlag).isTrue();
            } else {
                assertThat(team.get("id").asLong()).isEqualTo(otherTeam);
                assertThat(captainFlag).isFalse();
            }
        }

        JsonNode missing = api.get("/api/players/" + unique("nema"), null).expect(404).json();
        assertThat(missing.get("message").asString()).isEqualTo("Igrac ne postoji");
    }
}
