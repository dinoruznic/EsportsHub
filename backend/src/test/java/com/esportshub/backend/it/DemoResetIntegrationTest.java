package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractDemoIntegrationTest;
import com.esportshub.backend.support.Api;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class DemoResetIntegrationTest extends AbstractDemoIntegrationTest {

    @Test
    void onlyAdminsCanResetDemoData() {
        String player = api.register(unique("igrac"));

        api.post("/api/admin/demo/reset", null, null).expect(401);
        api.post("/api/admin/demo/reset", player, null).expect(403);
    }

    @Test
    void resetSeedsDemoDataAndIsIdempotent() {
        String admin = api.adminToken();
        String leftover = unique("stari");
        api.register(leftover);

        JsonNode first = api.post("/api/admin/demo/reset", admin, null).expect(200).json();
        JsonNode second = api.post("/api/admin/demo/reset", api.adminToken(), null).expect(200).json();

        assertThat(second).isEqualTo(first);
        assertThat(first.get("users").asLong()).isEqualTo(60);
        assertThat(first.get("teams").asLong()).isEqualTo(10);
        assertThat(first.get("tournaments").asLong()).isEqualTo(4);
        assertThat(first.get("listings").asLong()).isEqualTo(4);

        api.login(leftover, Api.PASSWORD).expect(401);
        api.login("dino", "lozinka123").expect(200);
        String token = api.adminToken();

        JsonNode stats = api.get("/api/admin/stats", token).expect(200).json();
        assertThat(stats.get("users").asLong()).isEqualTo(60);
        assertThat(stats.get("liveMatches").asLong()).isZero();
        JsonNode byStatus = stats.get("tournamentsByStatus");
        assertThat(byStatus.get("COMPLETED").asLong()).isEqualTo(1);
        assertThat(byStatus.get("ONGOING").asLong()).isEqualTo(1);
        assertThat(byStatus.get("REGISTRATION").asLong()).isEqualTo(1);
        assertThat(byStatus.get("PENDING").asLong()).isEqualTo(1);

        assertThat(roles(token, "sudija_amra")).containsExactly("PLAYER", "REFEREE");
        assertThat(roles(token, "org_mostar")).containsExactly("ORGANIZER", "PLAYER");
        assertThat(roles(token, "admin")).contains("ADMIN");
        assertThat(api.get("/api/players/dino/game-accounts", null).expect(200).json()).hasSize(3);
    }

    @Test
    void seededTournamentsHaveTheExpectedState() {
        api.post("/api/admin/demo/reset", api.adminToken(), null).expect(200);
        Map<String, JsonNode> tournaments = stream(api.get("/api/tournaments", null).expect(200).json())
                .collect(Collectors.toMap(t -> t.get("name").asString(), Function.identity()));

        JsonNode autumn = bracket(tournaments.get("Jesenji LoL Kup"));
        assertThat(autumn.get("status").asString()).isEqualTo("COMPLETED");
        assertThat(matches(autumn)).allSatisfy(match -> {
            assertThat(match.get("status").asString()).isEqualTo("FINISHED");
            assertThat(match.get("refereeUsername").isNull()).isFalse();
        });
        JsonNode autumnFinal = lastRound(autumn).get(0);
        assertThat(winnerName(autumnFinal)).isEqualTo("Drina Drakes");
        assertThat(Math.max(autumnFinal.get("scoreA").asInt(), autumnFinal.get("scoreB").asInt())).isEqualTo(3);
        assertThat(api.get("/api/matches/" + autumnFinal.get("id").asLong() + "/events", null).expect(200).json())
                .extracting(event -> event.get("type").asString())
                .contains("STARTED", "SCORE_UPDATED", "FINISHED", "TOURNAMENT_COMPLETED");

        JsonNode open = bracket(tournaments.get("Sarajevo Open"));
        assertThat(open.get("status").asString()).isEqualTo("ONGOING");
        assertThat(round(open, 0)).allSatisfy(match -> assertThat(match.get("status").asString()).isEqualTo("FINISHED"));
        List<JsonNode> semifinals = round(open, 1);
        assertThat(semifinals).allSatisfy(match -> {
            assertThat(match.get("status").asString()).isEqualTo("SCHEDULED");
            assertThat(match.get("teamA").isNull()).isFalse();
            assertThat(match.get("teamB").isNull()).isFalse();
        });
        assertThat(semifinals).extracting(match -> match.get("refereeUsername").asString())
                .containsExactly("sudija_amra", "sudija_kenan");
        JsonNode openFinal = lastRound(open).get(0);
        assertThat(openFinal.get("teamA").isNull()).isTrue();
        assertThat(openFinal.get("status").asString()).isEqualTo("SCHEDULED");

        JsonNode balkan = tournaments.get("Balkan LoL Kup");
        assertThat(balkan.get("status").asString()).isEqualTo("REGISTRATION");
        assertThat(balkan.get("prizePool").asInt()).isEqualTo(2000);
        JsonNode registrations = api.get("/api/tournaments/" + balkan.get("id").asLong() + "/registrations", null)
                .expect(200).json();
        assertThat(registrations).hasSize(7);
        assertThat(registrations).extracting(r -> r.get("teamTag").asString()).doesNotContain("BW");

        JsonNode pending = api.get("/api/tournaments/pending", api.adminToken()).expect(200).json();
        assertThat(pending).extracting(t -> t.get("name").asString()).containsExactly("CS2 Liga BiH");
        assertThat(pending.get(0).get("gameCode").asString()).isEqualTo("CS2");
    }

    @Test
    void seededMarketHasOffersForDino() {
        api.post("/api/admin/demo/reset", api.adminToken(), null).expect(200);
        String dino = api.login("dino", "lozinka123").expect(200).json().get("token").asString();

        List<JsonNode> listings = stream(api.get("/api/market/listings", null).expect(200).json()).toList();
        assertThat(listings).hasSize(4);
        JsonNode dinoListing = listings.stream()
                .filter(listing -> listing.get("ownerUsername").asString().equals("dino"))
                .findFirst()
                .orElseThrow();
        assertThat(dinoListing.get("gameCode").asString()).isEqualTo("LOL");
        assertThat(dinoListing.get("offerCount").asLong()).isEqualTo(2);

        JsonNode offers = api.get("/api/market/listings/" + dinoListing.get("id").asLong() + "/offers", dino)
                .expect(200).json();
        assertThat(offers).extracting(offer -> offer.get("amount").asInt()).containsExactlyInAnyOrder(650, 600);

        JsonNode wolves = stream(api.get("/api/teams", null).expect(200).json())
                .filter(team -> team.get("tag").asString().equals("BW"))
                .findFirst()
                .orElseThrow();
        assertThat(api.get("/api/teams/" + wolves.get("id").asLong(), null).expect(200).json().get("members"))
                .hasSize(5);
    }

    private List<String> roles(String token, String username) {
        JsonNode page = api.get("/api/admin/users?query=" + username, token).expect(200).json();
        JsonNode user = stream(page.get("content"))
                .filter(candidate -> candidate.get("username").asString().equals(username))
                .findFirst()
                .orElseThrow();
        return stream(user.get("roles")).map(JsonNode::asString).toList();
    }

    private JsonNode bracket(JsonNode tournament) {
        return api.get("/api/tournaments/" + tournament.get("id").asLong() + "/bracket", null).expect(200).json();
    }

    private static List<JsonNode> matches(JsonNode bracket) {
        return stream(bracket.get("rounds")).flatMap(round -> stream(round.get("matches"))).toList();
    }

    private static List<JsonNode> round(JsonNode bracket, int index) {
        return stream(bracket.get("rounds").get(index).get("matches")).toList();
    }

    private static List<JsonNode> lastRound(JsonNode bracket) {
        return round(bracket, bracket.get("rounds").size() - 1);
    }

    private static String winnerName(JsonNode match) {
        long winner = match.get("winnerTeamId").asLong();
        JsonNode team = match.get("teamA").get("id").asLong() == winner ? match.get("teamA") : match.get("teamB");
        return team.get("name").asString();
    }

    private static Stream<JsonNode> stream(JsonNode node) {
        return StreamSupport.stream(node.spliterator(), false);
    }
}
