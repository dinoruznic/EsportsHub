package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.Map;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class MarketOffersIntegrationTest extends AbstractIntegrationTest {

    @Test
    void listingsCountActiveOffersAndCaptainsSeeTheirOffers() {
        long lol = api.gameId("LOL");
        String seller = api.register(unique("prodavac"));
        String firstCaptain = api.register(unique("kapa"));
        String secondCaptain = api.register(unique("kapb"));
        String ign = unique("igrac") + "#EUW";

        long account = api.post("/api/me/game-accounts", seller, Map.of("gameId", lol, "inGameName", ign)).expect(201).id();
        long listing = api.post("/api/market/listings", seller, Map.of("gameAccountId", account)).expect(201).id();
        String firstTag = uniqueTag();
        long firstTeam = api.post("/api/teams", firstCaptain, Map.of("name", unique("Tim A "), "tag", firstTag, "gameId", lol))
                .expect(201).id();
        long secondTeam = api.post("/api/teams", secondCaptain, Map.of("name", unique("Tim B "), "tag", uniqueTag(), "gameId", lol))
                .expect(201).id();

        assertThat(offerCount(listing)).isZero();

        long firstOffer = api.post("/api/market/listings/" + listing + "/offers", firstCaptain,
                Map.of("teamId", firstTeam, "amount", 1500, "message", "Dobrodosao")).expect(201).id();
        long secondOffer = api.post("/api/market/listings/" + listing + "/offers", secondCaptain,
                Map.of("teamId", secondTeam, "amount", 900)).expect(201).id();
        assertThat(offerCount(listing)).isEqualTo(2);

        JsonNode mine = api.get("/api/me/offers", firstCaptain).expect(200).json();
        assertThat(mine).hasSize(1);
        JsonNode offer = mine.get(0);
        assertThat(offer.get("id").asLong()).isEqualTo(firstOffer);
        assertThat(offer.get("listingId").asLong()).isEqualTo(listing);
        assertThat(offer.get("listingStatus").asString()).isEqualTo("OPEN");
        assertThat(offer.get("teamId").asLong()).isEqualTo(firstTeam);
        assertThat(offer.get("teamTag").asString()).isEqualTo(firstTag);
        assertThat(offer.get("inGameName").asString()).isEqualTo(ign);
        assertThat(offer.get("gameCode").asString()).isEqualTo("LOL");
        assertThat(offer.get("amount").asInt()).isEqualTo(1500);
        assertThat(offer.get("message").asString()).isEqualTo("Dobrodosao");
        assertThat(offer.get("status").asString()).isEqualTo("PENDING");

        api.post("/api/market/offers/" + secondOffer + "/withdraw", secondCaptain, null).expect(200);
        assertThat(offerCount(listing)).isEqualTo(1);

        api.post("/api/market/offers/" + firstOffer + "/accept", seller, null).expect(200);
        JsonNode accepted = api.get("/api/me/offers", firstCaptain).expect(200).json().get(0);
        assertThat(accepted.get("status").asString()).isEqualTo("ACCEPTED");
        assertThat(accepted.get("listingStatus").asString()).isEqualTo("CLOSED");
        assertThat(accepted.get("respondedAt").isNull()).isFalse();
        assertThat(api.get("/api/me/offers", secondCaptain).expect(200).json().get(0).get("status").asString())
                .isEqualTo("WITHDRAWN");

        assertThat(api.get("/api/me/offers", seller).expect(200).json()).isEmpty();
        api.get("/api/me/offers", null).expect(401);
    }

    private long offerCount(long listingId) {
        JsonNode listings = api.get("/api/market/listings", null).expect(200).json();
        return StreamSupport.stream(listings.spliterator(), false)
                .filter(listing -> listing.get("id").asLong() == listingId)
                .findFirst()
                .orElseThrow()
                .get("offerCount")
                .asLong();
    }
}
