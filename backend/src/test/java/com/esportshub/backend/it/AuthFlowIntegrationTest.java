package com.esportshub.backend.it;

import com.esportshub.backend.support.AbstractIntegrationTest;
import com.esportshub.backend.support.Api;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AuthFlowIntegrationTest extends AbstractIntegrationTest {

    @Test
    void registerReturnsCreatedWithBearerTokenAndPlayerRole() {
        String username = unique("auth");

        Api.Response response = api.post("/api/auth/register", null, Map.of(
                "username", username,
                "email", username + "@it.local",
                "password", Api.PASSWORD)).expect(201);

        assertThat(response.json().get("token").asString()).isNotBlank();
        assertThat(response.json().get("tokenType").asString()).isEqualTo("Bearer");
        assertThat(response.json().get("username").asString()).isEqualTo(username);
        assertThat(response.json().get("roles").toString()).contains("PLAYER");
    }

    @Test
    void duplicateUsernameIsConflict() {
        String username = unique("dup");
        api.register(username);

        api.post("/api/auth/register", null, Map.of(
                "username", username,
                "email", unique("drugi") + "@it.local",
                "password", Api.PASSWORD)).expect(409);
    }

    @Test
    void duplicateEmailIsConflictRegardlessOfCase() {
        String username = unique("mail");
        api.register(username);

        api.post("/api/auth/register", null, Map.of(
                "username", unique("drugi"),
                "email", (username + "@IT.local").toUpperCase(),
                "password", Api.PASSWORD)).expect(409);
    }

    @Test
    void shortPasswordIsBadRequest() {
        String username = unique("kratka");

        api.post("/api/auth/register", null, Map.of(
                "username", username,
                "email", username + "@it.local",
                "password", "1234567")).expect(400);
    }

    @Test
    void loginWorksWithUsernameAndWithEmail() {
        String username = unique("login");
        api.register(username);

        assertThat(api.login(username, Api.PASSWORD).expect(200).json().get("token").asString()).isNotBlank();
        api.login(username + "@it.local", Api.PASSWORD).expect(200);
    }

    @Test
    void wrongPasswordIsUnauthorized() {
        String username = unique("pogresna");
        api.register(username);

        api.login(username, "nije-ta-lozinka").expect(401);
    }

    @Test
    void unknownUserIsUnauthorized() {
        api.login(unique("nepostoji"), Api.PASSWORD).expect(401);
    }

    @Test
    void protectedRouteWithoutTokenIsUnauthorized() {
        api.get("/api/me/game-accounts", null).expect(401);
    }

    @Test
    void protectedRouteWithGarbageTokenIsUnauthorized() {
        api.get("/api/me/game-accounts", "ovo.nije.token").expect(401);
        api.get("/api/me/game-accounts", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.potpis").expect(401);
    }

    @Test
    void protectedRouteWithValidTokenIsOk() {
        String token = api.register(unique("ok"));

        api.get("/api/me/game-accounts", token).expect(200);
    }
}
