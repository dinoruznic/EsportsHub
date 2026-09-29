package com.esportshub.backend.support;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.MissingNode;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

public class Api {

    public static final String PASSWORD = "lozinka123";
    public static final String ADMIN_USERNAME = "admin";
    public static final String ADMIN_PASSWORD = "admin12345";

    private final String baseUrl;
    private final JsonMapper jsonMapper;
    private final HttpClient http = HttpClient.newHttpClient();

    public Api(String baseUrl, JsonMapper jsonMapper) {
        this.baseUrl = baseUrl;
        this.jsonMapper = jsonMapper;
    }

    public record Response(int status, JsonNode body, String raw) {

        public Response expect(int expected) {
            assertThat(status).as("HTTP status, tijelo: %s", raw).isEqualTo(expected);
            return this;
        }

        public JsonNode json() {
            return body;
        }

        public long id() {
            return body.get("id").asLong();
        }
    }

    public String register(String username) {
        return post("/api/auth/register", null, Map.of(
                "username", username,
                "email", username + "@it.local",
                "password", PASSWORD))
                .expect(201)
                .json().get("token").asString();
    }

    public Response login(String usernameOrEmail, String password) {
        return post("/api/auth/login", null, Map.of("usernameOrEmail", usernameOrEmail, "password", password));
    }

    public String adminToken() {
        return login(ADMIN_USERNAME, ADMIN_PASSWORD).expect(200).json().get("token").asString();
    }

    public void grantRole(String username, String role) {
        post("/api/admin/users/" + username + "/roles", adminToken(), Map.of("role", role)).expect(200);
    }

    public long gameId(String code) {
        for (JsonNode game : get("/api/games", null).expect(200).json()) {
            if (code.equals(game.get("code").asString())) {
                return game.get("id").asLong();
            }
        }
        throw new IllegalArgumentException("nema igre " + code);
    }

    public long optionId(long gameId, String kind, String code) {
        for (JsonNode option : get("/api/games/" + gameId + "/" + kind, null).expect(200).json()) {
            if (code.equals(option.get("code").asString())) {
                return option.get("id").asLong();
            }
        }
        throw new IllegalArgumentException("nema opcije " + kind + "/" + code);
    }

    public Response get(String path, String token) {
        return send("GET", path, token, null);
    }

    public Response post(String path, String token, Object body) {
        return send("POST", path, token, body);
    }

    public Response put(String path, String token, Object body) {
        return send("PUT", path, token, body);
    }

    public Response delete(String path, String token) {
        return send("DELETE", path, token, null);
    }

    public Response send(String method, String path, String token, Object body) {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .header("Accept", "application/json");
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        if (body != null) {
            request.header("Content-Type", "application/json");
            request.method(method, HttpRequest.BodyPublishers.ofString(jsonMapper.writeValueAsString(body)));
        } else {
            request.method(method, HttpRequest.BodyPublishers.noBody());
        }

        try {
            HttpResponse<String> response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
            String raw = response.body();
            JsonNode json = raw == null || raw.isBlank() ? MissingNode.getInstance() : jsonMapper.readTree(raw);
            return new Response(response.statusCode(), json, raw);
        } catch (IOException e) {
            throw new IllegalStateException("HTTP poziv " + method + " " + path + " nije uspio", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("prekinut HTTP poziv", e);
        }
    }
}
