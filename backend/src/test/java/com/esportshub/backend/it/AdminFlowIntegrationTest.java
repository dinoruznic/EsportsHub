package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class AdminFlowIntegrationTest extends AbstractIntegrationTest {

    @Test
    void nonAdminsCannotUseTheAdminApi() {
        String player = api.register(unique("obican"));

        api.get("/api/admin/users", player).expect(403);
        api.get("/api/admin/stats", player).expect(403);
        api.delete("/api/admin/users/admin/roles/ADMIN", player).expect(403);
        api.get("/api/admin/users", null).expect(401);
        api.get("/api/admin/stats", null).expect(401);
    }

    @Test
    void demoEndpointsAreMissingWhenDemoIsDisabled() {
        api.post("/api/admin/demo/reset", api.adminToken(), null).expect(404);
    }

    @Test
    void adminSearchesUsersByQueryAndRole() {
        String admin = api.adminToken();
        String marker = unique("trazi");
        String organizerName = marker + "o";
        String refereeName = marker + "s";
        api.register(organizerName);
        api.register(refereeName);
        api.grantRole(organizerName, "ORGANIZER");
        api.grantRole(refereeName, "REFEREE");

        JsonNode page = api.get("/api/admin/users?query=" + marker.toUpperCase() + "&size=10", admin).expect(200).json();
        assertThat(usernames(page)).containsExactly(organizerName, refereeName);
        assertThat(page.get("totalElements").asLong()).isEqualTo(2);
        assertThat(page.get("totalPages").asInt()).isEqualTo(1);
        assertThat(page.get("page").asInt()).isZero();
        JsonNode first = page.get("content").get(0);
        assertThat(first.get("email").asString()).isEqualTo(organizerName + "@it.local");
        assertThat(first.get("displayName").asString()).isEqualTo(organizerName);
        assertThat(first.get("createdAt").isNull()).isFalse();
        assertThat(roles(first)).containsExactly("ORGANIZER", "PLAYER");

        JsonNode referees = api.get("/api/admin/users?query=" + marker + "&role=referee", admin).expect(200).json();
        assertThat(usernames(referees)).containsExactly(refereeName);

        JsonNode byEmail = api.get("/api/admin/users?query=" + refereeName + "@it.LOCAL", admin).expect(200).json();
        assertThat(usernames(byEmail)).containsExactly(refereeName);

        JsonNode paged = api.get("/api/admin/users?query=" + marker + "&size=1&page=1", admin).expect(200).json();
        assertThat(usernames(paged)).containsExactly(refereeName);
        assertThat(paged.get("totalPages").asInt()).isEqualTo(2);

        JsonNode admins = api.get("/api/admin/users?role=ADMIN", admin).expect(200).json();
        assertThat(usernames(admins)).contains("admin");
    }

    @Test
    void adminGrantsAndRevokesManagedRoles() {
        String admin = api.adminToken();
        String username = unique("uloge");
        String token = api.register(username);
        String base = "/api/admin/users/" + username + "/roles";

        assertThat(strings(api.post(base, admin, Map.of("role", "organizer")).expect(200).json()))
                .containsExactly("ORGANIZER", "PLAYER");
        api.post(base, admin, Map.of("role", "ORGANIZER")).expect(409);
        api.post(base, admin, Map.of("role", "PLAYER")).expect(400);
        api.post(base, admin, Map.of("role", "NEPOSTOJECA")).expect(400);
        api.post("/api/admin/users/" + unique("nema") + "/roles", admin, Map.of("role", "REFEREE")).expect(404);
        api.post("/api/tournaments", token, Map.of(
                "name", unique("Kup "),
                "gameId", api.gameId("LOL"),
                "format", "SINGLE_ELIMINATION",
                "maxTeams", 4)).expect(201);

        assertThat(strings(api.delete(base + "/ORGANIZER", admin).expect(200).json())).containsExactly("PLAYER");
        api.delete(base + "/ORGANIZER", admin).expect(409);
        api.delete(base + "/PLAYER", admin).expect(400);
        api.delete(base + "/NEPOSTOJECA", admin).expect(400);
        api.delete("/api/admin/users/" + unique("nema") + "/roles/REFEREE", admin).expect(404);
        api.get("/api/admin/stats", token).expect(403);

        api.post(base, admin, Map.of("role", "ADMIN")).expect(200);
        api.get("/api/admin/stats", token).expect(200);
        api.delete(base + "/ADMIN", token).expect(409);
        api.delete("/api/admin/users/admin/roles/ADMIN", admin).expect(409);
        assertThat(strings(api.delete(base + "/ADMIN", admin).expect(200).json())).containsExactly("PLAYER");
    }

    @Test
    void statsCountUsersTournamentsAndMatches() {
        String admin = api.adminToken();
        JsonNode before = api.get("/api/admin/stats", admin).expect(200).json();
        String organizer = api.registerOrganizer(unique("statorg"));
        api.post("/api/tournaments", organizer, Map.of(
                "name", unique("Stat kup "),
                "gameId", api.gameId("LOL"),
                "format", "SINGLE_ELIMINATION",
                "maxTeams", 4)).expect(201);

        JsonNode after = api.get("/api/admin/stats", admin).expect(200).json();
        assertThat(after.get("users").asLong()).isEqualTo(before.get("users").asLong() + 1);
        assertThat(after.get("tournamentsByStatus").get("PENDING").asLong())
                .isEqualTo(before.get("tournamentsByStatus").get("PENDING").asLong() + 1);
        assertThat(after.get("tournamentsByStatus").propertyNames())
                .containsExactly("PENDING", "REGISTRATION", "ONGOING", "COMPLETED", "REJECTED", "CANCELLED");
        assertThat(after.get("teams").asLong()).isGreaterThanOrEqualTo(0);
        assertThat(after.get("liveMatches").asLong()).isGreaterThanOrEqualTo(0);
        assertThat(after.get("openListings").asLong()).isGreaterThanOrEqualTo(0);
    }

    private static List<String> usernames(JsonNode page) {
        return StreamSupport.stream(page.get("content").spliterator(), false)
                .map(user -> user.get("username").asString())
                .toList();
    }

    private static List<String> roles(JsonNode user) {
        return strings(user.get("roles"));
    }

    private static List<String> strings(JsonNode array) {
        return StreamSupport.stream(array.spliterator(), false).map(JsonNode::asString).toList();
    }
}
