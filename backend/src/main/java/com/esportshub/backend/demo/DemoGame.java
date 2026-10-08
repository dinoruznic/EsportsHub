package com.esportshub.backend.demo;

import com.esportshub.backend.live.LiveSnapshotMessage;

import java.time.Instant;
import java.util.Map;
import java.util.Random;

class DemoGame {

    static final int START_SECONDS = 14 * 60;

    private static final int SECONDS_PER_TICK = 20;
    private static final int START_GOLD = 2500;
    private static final int GOLD_PER_MINUTE = 400;
    private static final int TOWERS_FROM_SECONDS = 600;
    private static final int MAX_TOWERS = 11;

    private final String matchKey;
    private final Random random;
    private final boolean aFavored;

    private int ticks;
    private int gameTime = START_SECONDS;
    private int killsA;
    private int killsB;
    private int goldA;
    private int goldB;
    private int towersA;
    private int towersB;

    DemoGame(String matchKey, Random random) {
        this.matchKey = matchKey;
        this.random = random;
        this.aFavored = random.nextBoolean();

        double minutes = START_SECONDS / 60.0;
        int base = START_GOLD + (int) Math.round(GOLD_PER_MINUTE * minutes);
        int lead = (int) Math.round(minutes * (40 + random.nextInt(61)));
        killsA = (int) Math.round(minutes / 2 + random.nextInt(4));
        killsB = (int) Math.round(minutes / 2 + random.nextInt(4));
        goldA = base + (aFavored ? lead : 0);
        goldB = base + (aFavored ? 0 : lead);
        towersA = random.nextInt(3);
        towersB = random.nextInt(3);
    }

    LiveSnapshotMessage next(Instant capturedAt) {
        ticks++;
        gameTime += SECONDS_PER_TICK;
        killsA += kills(aFavored);
        killsB += kills(!aFavored);
        goldA += gold(aFavored);
        goldB += gold(!aFavored);
        towersA = tower(towersA, aFavored);
        towersB = tower(towersB, !aFavored);

        return new LiveSnapshotMessage(matchKey, capturedAt, gameTime,
                killsA, killsB, goldA, goldB, towersA, towersB, Map.of("demo", true));
    }

    int ticks() {
        return ticks;
    }

    boolean sideAWinsMap() {
        double lead = Math.clamp((goldA - goldB) / 20000.0, -0.2, 0.2);
        return random.nextDouble() < 0.5 + lead;
    }

    private int kills(boolean favored) {
        double chance = favored ? 0.55 : 0.4;
        return random.nextDouble() < chance ? 1 + random.nextInt(2) : 0;
    }

    private int gold(boolean favored) {
        return SECONDS_PER_TICK * (favored ? 24 + random.nextInt(14) : 20 + random.nextInt(12));
    }

    private int tower(int current, boolean favored) {
        if (gameTime < TOWERS_FROM_SECONDS || current >= MAX_TOWERS) {
            return current;
        }
        double chance = favored ? 0.1 : 0.04;
        return random.nextDouble() < chance ? current + 1 : current;
    }
}
