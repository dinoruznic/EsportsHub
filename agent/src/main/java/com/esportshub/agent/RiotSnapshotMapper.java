package com.esportshub.agent;

import tools.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class RiotSnapshotMapper {

    private static final Pattern TURRET_OWNER = Pattern.compile("^Turret_T([12])_");
    private static final Pattern MINION_TEAM = Pattern.compile("^Minion_T(100|200)");

    private RiotSnapshotMapper() {
    }

    public static LiveSnapshotMessage map(JsonNode root, String matchKey, Side sideA, Instant capturedAt) {
        Map<String, Side> teamByName = new HashMap<>();
        Map<Side, Integer> kills = counter();
        for (JsonNode player : root.path("allPlayers")) {
            Optional<Side> team = side(player.path("team").asString(""));
            if (team.isEmpty()) {
                continue;
            }
            kills.merge(team.get(), player.path("scores").path("kills").asInt(0), Integer::sum);
            for (String field : new String[]{"riotId", "riotIdGameName", "summonerName"}) {
                String name = player.path(field).asString("");
                if (!name.isBlank()) {
                    teamByName.put(name, team.get());
                }
            }
        }

        Map<Side, Integer> towers = counter();
        Map<Side, Integer> dragons = counter();
        Map<Side, Integer> barons = counter();
        for (JsonNode event : root.path("events").path("Events")) {
            String killer = event.path("KillerName").asString("");
            switch (event.path("EventName").asString("")) {
                case "TurretKilled" -> turretDestroyer(event.path("TurretKilled").asString(""))
                        .or(() -> team(killer, teamByName))
                        .ifPresent(side -> towers.merge(side, 1, Integer::sum));
                case "DragonKill" -> team(killer, teamByName).ifPresent(side -> dragons.merge(side, 1, Integer::sum));
                case "BaronKill" -> team(killer, teamByName).ifPresent(side -> barons.merge(side, 1, Integer::sum));
                default -> {
                }
            }
        }

        Side sideB = sideA.opposite();
        Map<String, Object> raw = new LinkedHashMap<>();
        raw.put("dragonsA", dragons.get(sideA));
        raw.put("dragonsB", dragons.get(sideB));
        raw.put("baronsA", barons.get(sideA));
        raw.put("baronsB", barons.get(sideB));

        return new LiveSnapshotMessage(
                matchKey,
                capturedAt,
                (int) Math.floor(root.path("gameData").path("gameTime").asDouble(0)),
                kills.get(sideA),
                kills.get(sideB),
                null,
                null,
                towers.get(sideA),
                towers.get(sideB),
                raw);
    }

    static Optional<Side> turretDestroyer(String turretName) {
        Matcher matcher = TURRET_OWNER.matcher(turretName);
        if (!matcher.find()) {
            return Optional.empty();
        }
        Side owner = "1".equals(matcher.group(1)) ? Side.ORDER : Side.CHAOS;
        return Optional.of(owner.opposite());
    }

    private static Optional<Side> team(String killerName, Map<String, Side> teamByName) {
        if (teamByName.containsKey(killerName)) {
            return Optional.of(teamByName.get(killerName));
        }
        Matcher minion = MINION_TEAM.matcher(killerName);
        if (minion.find()) {
            return Optional.of("100".equals(minion.group(1)) ? Side.ORDER : Side.CHAOS);
        }
        return Optional.empty();
    }

    private static Optional<Side> side(String team) {
        return switch (team) {
            case "ORDER" -> Optional.of(Side.ORDER);
            case "CHAOS" -> Optional.of(Side.CHAOS);
            default -> Optional.empty();
        };
    }

    private static Map<Side, Integer> counter() {
        Map<Side, Integer> counter = new EnumMap<>(Side.class);
        counter.put(Side.ORDER, 0);
        counter.put(Side.CHAOS, 0);
        return counter;
    }
}
