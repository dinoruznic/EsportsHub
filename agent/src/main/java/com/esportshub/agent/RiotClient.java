package com.esportshub.agent;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.util.Optional;

public class RiotClient {

    private static final URI ALL_GAME_DATA = URI.create(
            "https://" + LocalRiotTrustManager.RIOT_HOST + ":" + LocalRiotTrustManager.RIOT_PORT
                    + "/liveclientdata/allgamedata");
    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    private final HttpClient http;
    private final ObjectMapper objectMapper;

    public RiotClient(ObjectMapper objectMapper) throws GeneralSecurityException {
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, new TrustManager[]{new LocalRiotTrustManager()}, null);

        this.http = HttpClient.newBuilder()
                .sslContext(sslContext)
                .connectTimeout(TIMEOUT)
                .build();
        this.objectMapper = objectMapper;
    }

    public Optional<JsonNode> fetchAllGameData() throws InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(ALL_GAME_DATA)
                .timeout(TIMEOUT)
                .GET()
                .build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(response.body());
            return root.has("gameData") ? Optional.of(root) : Optional.empty();
        } catch (IOException e) {
            return Optional.empty();
        }
    }
}
