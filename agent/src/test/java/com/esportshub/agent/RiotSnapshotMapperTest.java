package com.esportshub.agent;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RiotSnapshotMapperTest {

    private static final ObjectMapper MAPPER = JsonMapper.builder().build();
    private static final Instant NOW = Instant.parse("2026-09-29T20:15:00Z");
    private static JsonNode allGameData;

    @BeforeAll
    static void loadFixture() throws Exception {
        try (InputStream in = RiotSnapshotMapperTest.class.getResourceAsStream("/allgamedata.json")) {
            allGameData = MAPPER.readTree(in);
        }
    }

    @Test
    void mapsOrderAsTeamA() {
        LiveSnapshotMessage message = RiotSnapshotMapper.map(allGameData, "kljuc-1", Side.ORDER, NOW);

        assertEquals("kljuc-1", message.matchKey());
        assertEquals(NOW, message.capturedAt());
        assertEquals(1234, message.gameTimeSeconds());
        assertEquals(10, message.killsA());
        assertEquals(7, message.killsB());
        assertEquals(2, message.towersA());
        assertEquals(1, message.towersB());
        assertEquals(Map.of("dragonsA", 2, "dragonsB", 1, "baronsA", 1, "baronsB", 0), message.raw());
    }

    @Test
    void sideAChaosSwapsEverySide() {
        LiveSnapshotMessage message = RiotSnapshotMapper.map(allGameData, "kljuc-1", Side.CHAOS, NOW);

        assertEquals(7, message.killsA());
        assertEquals(10, message.killsB());
        assertEquals(1, message.towersA());
        assertEquals(2, message.towersB());
        assertEquals(Map.of("dragonsA", 1, "dragonsB", 2, "baronsA", 0, "baronsB", 1), message.raw());
    }

    @Test
    void goldIsNotExposedByLiveClientApi() {
        LiveSnapshotMessage message = RiotSnapshotMapper.map(allGameData, "kljuc-1", Side.ORDER, NOW);

        assertNull(message.goldA());
        assertNull(message.goldB());
    }

    @Test
    void turretNameDecidesWhoDestroyedIt() {
        assertEquals(Optional.of(Side.ORDER), RiotSnapshotMapper.turretDestroyer("Turret_T2_R_03_A"));
        assertEquals(Optional.of(Side.CHAOS), RiotSnapshotMapper.turretDestroyer("Turret_T1_C_07_A"));
        assertEquals(Optional.empty(), RiotSnapshotMapper.turretDestroyer("Barracks_T1_L1"));
    }

    @Test
    void unknownTurretNameFallsBackToKillerTeam() {
        JsonNode root = MAPPER.readTree("""
                {
                  "allPlayers": [
                    { "riotId": "Grom#EUNE", "riotIdGameName": "Grom", "team": "CHAOS", "scores": { "kills": 0 } }
                  ],
                  "events": { "Events": [
                    { "EventName": "TurretKilled", "TurretKilled": "Turret_Nexus_Novi", "KillerName": "Grom" },
                    { "EventName": "TurretKilled", "TurretKilled": "Turret_Nepoznat", "KillerName": "Minion_T100L2S03N0007" }
                  ] },
                  "gameData": { "gameTime": 42.9 }
                }
                """);

        LiveSnapshotMessage message = RiotSnapshotMapper.map(root, "k", Side.ORDER, NOW);

        assertEquals(42, message.gameTimeSeconds());
        assertEquals(1, message.towersA());
        assertEquals(1, message.towersB());
    }

    @Test
    void serializedMessageMatchesBackendContract() {
        LiveSnapshotMessage message = RiotSnapshotMapper.map(allGameData, "kljuc-1", Side.ORDER, NOW);
        JsonNode json = MAPPER.readTree(MAPPER.writeValueAsString(message));

        Set<String> expected = Set.of("matchKey", "capturedAt", "gameTimeSeconds", "killsA", "killsB",
                "goldA", "goldB", "towersA", "towersB", "raw");
        assertEquals(expected, Set.copyOf(json.propertyNames()));
        assertEquals("2026-09-29T20:15:00Z", json.get("capturedAt").asString());
        assertTrue(json.get("goldA").isNull());
    }
}
