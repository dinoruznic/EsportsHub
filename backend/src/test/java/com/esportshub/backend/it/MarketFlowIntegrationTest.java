package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import com.esportshub.backend.support.Api;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class MarketFlowIntegrationTest extends AbstractIntegrationTest {

    private long lol;
    private long cs2;
    private String seller;
    private long accountId;
    private String captainA;
    private long teamA;
    private String captainB;
    private long teamB;

    @BeforeEach
    void setUp() {
        lol = api.gameId("LOL");
        cs2 = api.gameId("CS2");
        seller = api.register(unique("prodavac"));
        accountId = account(seller, lol);
        captainA = api.register(unique("kapA"));
        teamA = team(captainA, lol);
        captainB = api.register(unique("kapB"));
        teamB = team(captainB, lol);
    }

    @Test
    void listingLifecycleUpdatesMarketStatus() {
        long listingId = api.post("/api/market/listings", seller, Map.of("gameAccountId", accountId, "askingPrice", 900))
                .expect(201).id();
        assertThat(marketStatus()).isEqualTo("AVAILABLE");
        assertThat(openListingIds()).contains(listingId);

        api.post("/api/market/listings", seller, Map.of("gameAccountId", accountId)).expect(409);
        api.post("/api/market/listings", captainA, Map.of("gameAccountId", accountId)).expect(403);
        api.post("/api/market/listings/" + listingId + "/cancel", captainA, null).expect(403);

        JsonNode cancelled = api.post("/api/market/listings/" + listingId + "/cancel", seller, null).expect(200).json();
        assertThat(cancelled.get("status").asString()).isEqualTo("CANCELLED");
        assertThat(marketStatus()).isEqualTo("INACTIVE");
        assertThat(openListingIds()).doesNotContain(listingId);
        api.post("/api/market/listings/" + listingId + "/cancel", seller, null).expect(409);
    }

    @Test
    void offerRulesAndVisibility() {
        long listingId = listing();
        String cs2Captain = api.register(unique("kapCS"));
        long cs2Team = team(cs2Captain, cs2);
        long sellersTeam = team(seller, lol);

        offer(captainA, listingId, teamA, 1000).expect(201);
        offer(captainB, listingId, teamB, 1500).expect(201);
        offer(cs2Captain, listingId, cs2Team, 500).expect(400);
        offer(seller, listingId, sellersTeam, 500).expect(400);
        offer(captainB, listingId, teamA, 2000).expect(403);

        JsonNode offers = api.get("/api/market/listings/" + listingId + "/offers", seller).expect(200).json();
        assertThat(offers).hasSize(2);
        assertThat(offers).allSatisfy(o -> assertThat(o.get("status").asString()).isEqualTo("PENDING"));
        api.get("/api/market/listings/" + listingId + "/offers", captainA).expect(403);
    }

    @Test
    void acceptingOfferSignsPlayerAndClosesMarket() {
        long listingId = listing();
        long winningOffer = offer(captainA, listingId, teamA, 1000).expect(201).id();
        long losingOffer = offer(captainB, listingId, teamB, 1500).expect(201).id();

        api.post("/api/market/offers/" + winningOffer + "/accept", captainA, null).expect(403);
        JsonNode contract = api.post("/api/market/offers/" + winningOffer + "/accept", seller, null).expect(200).json();

        assertThat(contract.get("status").asString()).isEqualTo("ACTIVE");
        assertThat(contract.get("salary").asInt()).isEqualTo(1000);
        assertThat(contract.get("teamId").asLong()).isEqualTo(teamA);

        JsonNode contracts = api.get("/api/market/teams/" + teamA + "/contracts", null).expect(200).json();
        assertThat(contracts).anySatisfy(c -> {
            assertThat(c.get("gameAccountId").asLong()).isEqualTo(accountId);
            assertThat(c.get("salary").asInt()).isEqualTo(1000);
        });

        JsonNode roster = api.get("/api/teams/" + teamA, null).expect(200).json().get("members");
        assertThat(roster).anySatisfy(m -> assertThat(m.get("gameAccountId").asLong()).isEqualTo(accountId));

        assertThat(openListingIds()).doesNotContain(listingId);
        assertThat(marketStatus()).isEqualTo("INACTIVE");

        Map<Long, String> statuses = offerStatuses(listingId);
        assertThat(statuses).containsEntry(winningOffer, "ACCEPTED").containsEntry(losingOffer, "REJECTED");

        api.post("/api/market/offers/" + winningOffer + "/accept", seller, null).expect(409);
        api.post("/api/market/offers/" + losingOffer + "/accept", seller, null).expect(409);
    }

    @Test
    void rejectAndWithdrawCloseSingleOffers() {
        long listingId = listing();
        long offerA = offer(captainA, listingId, teamA, 1000).expect(201).id();
        long offerB = offer(captainB, listingId, teamB, 1200).expect(201).id();

        api.post("/api/market/offers/" + offerA + "/reject", captainB, null).expect(403);
        api.post("/api/market/offers/" + offerB + "/withdraw", captainA, null).expect(403);

        assertThat(api.post("/api/market/offers/" + offerA + "/reject", seller, null).expect(200)
                .json().get("status").asString()).isEqualTo("REJECTED");
        assertThat(api.post("/api/market/offers/" + offerB + "/withdraw", captainB, null).expect(200)
                .json().get("status").asString()).isEqualTo("WITHDRAWN");

        api.post("/api/market/offers/" + offerA + "/accept", seller, null).expect(409);
        api.post("/api/market/offers/" + offerA + "/withdraw", captainA, null).expect(409);
        assertThat(openListingIds()).contains(listingId);
        assertThat(marketStatus()).isEqualTo("AVAILABLE");
    }

    private long listing() {
        return api.post("/api/market/listings", seller, Map.of("gameAccountId", accountId, "askingPrice", 900))
                .expect(201).id();
    }

    private Api.Response offer(String token, long listingId, long teamId, int amount) {
        Map<String, Object> body = new HashMap<>();
        body.put("teamId", teamId);
        body.put("amount", amount);
        body.put("message", "ponuda");
        return api.post("/api/market/listings/" + listingId + "/offers", token, body);
    }

    private String marketStatus() {
        return StreamSupport.stream(api.get("/api/me/game-accounts", seller).expect(200).json().spliterator(), false)
                .filter(a -> a.get("id").asLong() == accountId)
                .findFirst()
                .orElseThrow()
                .get("marketStatus").asString();
    }

    private List<Long> openListingIds() {
        return StreamSupport.stream(api.get("/api/market/listings?gameId=" + lol, null).expect(200).json().spliterator(), false)
                .map(l -> l.get("id").asLong())
                .toList();
    }

    private Map<Long, String> offerStatuses(long listingId) {
        Map<Long, String> statuses = new HashMap<>();
        api.get("/api/market/listings/" + listingId + "/offers", seller).expect(200).json()
                .forEach(o -> statuses.put(o.get("id").asLong(), o.get("status").asString()));
        return statuses;
    }

    private long account(String token, long gameId) {
        return api.post("/api/me/game-accounts", token, Map.of("gameId", gameId, "inGameName", unique("p")))
                .expect(201).id();
    }

    private long team(String captainToken, long gameId) {
        return api.post("/api/teams", captainToken, Map.of("name", unique("Tim "), "tag", uniqueTag(), "gameId", gameId))
                .expect(201).id();
    }
}
