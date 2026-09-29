package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import com.esportshub.backend.support.Api;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GameAccountFlowIntegrationTest extends AbstractIntegrationTest {

    private long lol;
    private long cs2;
    private long valorant;
    private String username;
    private String token;

    @BeforeEach
    void setUp() {
        lol = api.gameId("LOL");
        cs2 = api.gameId("CS2");
        valorant = api.gameId("VALORANT");
        username = unique("igrac");
        token = api.register(username);
    }

    @Test
    void optionsArePublicAndRanksAreOrderedByStrength() {
        List<String> ranks = codes(api.get("/api/games/" + lol + "/ranks", null).expect(200).json());

        assertThat(ranks).startsWith("IRON", "BRONZE").endsWith("GRANDMASTER", "CHALLENGER").hasSize(10);
        assertThat(codes(api.get("/api/games/" + lol + "/regions", null).expect(200).json())).contains("EUW", "NA");
        assertThat(codes(api.get("/api/games/" + lol + "/positions", null).expect(200).json()))
                .containsExactlyInAnyOrder("TOP", "JUNGLE", "MID", "ADC", "SUPPORT");
        assertThat(api.get("/api/games/" + cs2 + "/ranks", null).expect(200).json()).isEmpty();
    }

    @Test
    void lolAccountStoresRankRegionAndPositionLabels() {
        JsonNode account = create(lol, Map.of(
                "rankId", api.optionId(lol, "ranks", "DIAMOND"),
                "regionId", api.optionId(lol, "regions", "EUW"),
                "positionId", api.optionId(lol, "positions", "MID"))).expect(201).json();

        assertThat(account.get("gameCode").asString()).isEqualTo("LOL");
        assertThat(account.get("rank").asString()).isEqualTo("DIAMOND");
        assertThat(account.get("region").asString()).isEqualTo("EUW");
        assertThat(account.get("position").asString()).isEqualTo("MID");
        assertThat(account.get("rating").isNull()).isTrue();
        assertThat(account.get("marketStatus").asString()).isEqualTo("INACTIVE");
    }

    @Test
    void cs2AccountStoresRating() {
        JsonNode account = create(cs2, Map.of("rating", 2100)).expect(201).json();

        assertThat(account.get("rating").asInt()).isEqualTo(2100);
        assertThat(account.get("rank").isNull()).isTrue();
    }

    @Test
    void optionFromAnotherGameIsBadRequest() {
        create(lol, Map.of("rankId", api.optionId(valorant, "ranks", "RADIANT"))).expect(400);
        create(lol, Map.of("regionId", api.optionId(cs2, "regions", "ASIA"))).expect(400);
        create(lol, Map.of("positionId", api.optionId(cs2, "positions", "AWP"))).expect(400);
    }

    @Test
    void attributeOfWrongRankTypeIsBadRequest() {
        create(lol, Map.of("rating", 1500)).expect(400);
        create(cs2, Map.of("rankId", api.optionId(lol, "ranks", "GOLD"))).expect(400);
    }

    @Test
    void secondAccountForSameGameIsConflict() {
        create(lol, Map.of()).expect(201);

        create(lol, Map.of()).expect(409);
    }

    @Test
    void publicProfileListsAllAccounts() {
        create(lol, Map.of()).expect(201);
        create(cs2, Map.of("rating", 1800)).expect(201);

        JsonNode accounts = api.get("/api/players/" + username + "/game-accounts", null).expect(200).json();

        List<String> games = new ArrayList<>();
        accounts.forEach(account -> games.add(account.get("gameCode").asString()));
        assertThat(games).containsExactlyInAnyOrder("LOL", "CS2");
        api.get("/api/players/" + unique("nema") + "/game-accounts", null).expect(404);
    }

    @Test
    void onlyOwnerCanUpdateAndDeleteAccount() {
        long accountId = create(lol, Map.of()).expect(201).id();
        String stranger = api.register(unique("stranac"));
        Map<String, Object> update = Map.of(
                "inGameName", "Novo#EUW",
                "rankId", api.optionId(lol, "ranks", "MASTER"),
                "marketStatus", "INACTIVE");

        api.put("/api/me/game-accounts/" + accountId, stranger, update).expect(404);
        api.delete("/api/me/game-accounts/" + accountId, stranger).expect(404);

        JsonNode updated = api.put("/api/me/game-accounts/" + accountId, token, update).expect(200).json();
        assertThat(updated.get("inGameName").asString()).isEqualTo("Novo#EUW");
        assertThat(updated.get("rank").asString()).isEqualTo("MASTER");

        api.delete("/api/me/game-accounts/" + accountId, token).expect(204);
        assertThat(api.get("/api/me/game-accounts", token).expect(200).json()).isEmpty();
    }

    private Api.Response create(long gameId, Map<String, Object> attributes) {
        Map<String, Object> body = new HashMap<>(attributes);
        body.put("gameId", gameId);
        body.put("inGameName", username + "#IT");
        return api.post("/api/me/game-accounts", token, body);
    }

    private static List<String> codes(JsonNode options) {
        List<String> codes = new ArrayList<>();
        options.forEach(option -> codes.add(option.get("code").asString()));
        return codes;
    }
}
