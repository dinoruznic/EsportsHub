package com.esportshub.backend.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Jednostavan test endpoint da provjerimo da backend radi.
 * GET http://localhost:8080/api/ping
 */
@RestController
@RequestMapping("/api")
public class PingController {

    @GetMapping("/ping")
    public Map<String, Object> ping() {
        return Map.of(
            "status", "ok",
            "service", "esports-hub-backend",
            "time", Instant.now().toString()
        );
    }
}
