package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityMatrixIntegrationTest extends AbstractIntegrationTest {

    @ParameterizedTest(name = "GET {0} je javan")
    @ValueSource(strings = {
            "/api/games",
            "/api/games/1/regions",
            "/api/games/1/positions",
            "/api/games/1/ranks",
            "/api/tournaments",
            "/api/tournaments/999999",
            "/api/tournaments/999999/registrations",
            "/api/tournaments/999999/bracket",
            "/api/matches/999999",
            "/api/matches/999999/events",
            "/api/matches/999999/live",
            "/api/market/listings",
            "/api/market/teams/999999/contracts",
            "/api/players/admin/game-accounts",
            "/api/teams",
            "/api/teams/999999",
            "/spectator.html"
    })
    void publicReadIsReachableWithoutToken(String path) {
        int status = api.get(path, null).status();

        assertThat(status).as("GET %s", path).isNotIn(401, 403);
    }

    @ParameterizedTest(name = "{0} {1} trazi prijavu")
    @CsvSource({
            "POST, /api/tournaments",
            "POST, /api/tournaments/1/registrations",
            "POST, /api/tournaments/1/bracket",
            "GET, /api/tournaments/pending",
            "POST, /api/teams",
            "POST, /api/teams/1/members",
            "POST, /api/market/listings",
            "POST, /api/market/offers/1/accept",
            "GET, /api/me/game-accounts",
            "POST, /api/me/game-accounts",
            "POST, /api/matches/1/start",
            "PUT, /api/matches/1/score",
            "POST, /api/matches/1/finish",
            "GET, /api/matches/1/agent-key",
            "POST, /api/matches/1/simulate-snapshot",
            "POST, /api/admin/users/admin/roles"
    })
    void protectedEndpointWithoutTokenIsUnauthorized(String method, String path) {
        Object body = "GET".equals(method) ? null : Map.of();

        api.send(method, path, null, body).expect(401);
    }

    @ParameterizedTest(name = "{0} {1} je samo za admina")
    @CsvSource({
            "GET, /api/tournaments/pending",
            "POST, /api/tournaments/999999/approve",
            "POST, /api/tournaments/999999/reject",
            "POST, /api/admin/users/admin/roles"
    })
    void adminOnlyEndpointIsForbiddenForNormalUser(String method, String path) {
        String token = api.register(unique("obican"));
        Object body = path.endsWith("/roles") ? Map.of("role", "REFEREE") : null;

        api.send(method, path, token, body).expect(403);
    }

    @ParameterizedTest(name = "admin smije {0} {1}")
    @CsvSource({
            "GET, /api/tournaments/pending"
    })
    void adminOnlyEndpointIsAllowedForAdmin(String method, String path) {
        api.send(method, path, api.adminToken(), null).expect(200);
    }
}
