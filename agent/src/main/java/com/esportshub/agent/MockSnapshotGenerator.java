package com.esportshub.agent;

import java.time.Instant;
import java.util.Map;
import java.util.Random;

public class MockSnapshotGenerator {

    private static final int START_GOLD = 2500;
    private static final int MAX_TOWERS = 11;
    private static final int TOWERS_FROM_SECONDS = 600;

    private final String matchKey;
    private final int intervalSeconds;
    private final Random random;

    private int gameTime;
    private int killsA;
    private int killsB;
    private int goldA = START_GOLD;
    private int goldB = START_GOLD;
    private int towersA;
    private int towersB;

    public MockSnapshotGenerator(String matchKey, int intervalSeconds, Random random) {
        this.matchKey = matchKey;
        this.intervalSeconds = intervalSeconds;
        this.random = random;
    }

    public LiveSnapshotMessage next(Instant capturedAt) {
        gameTime += intervalSeconds;
        killsA += kills();
        killsB += kills();
        goldA += gold();
        goldB += gold();
        towersA = tower(towersA);
        towersB = tower(towersB);

        return new LiveSnapshotMessage(matchKey, capturedAt, gameTime,
                killsA, killsB, goldA, goldB, towersA, towersB, Map.of("mock", true));
    }

    private int kills() {
        double chance = Math.min(0.9, 0.06 * intervalSeconds);
        return random.nextDouble() < chance ? 1 + random.nextInt(2) : 0;
    }

    private int gold() {
        return intervalSeconds * (20 + random.nextInt(21));
    }

    private int tower(int current) {
        if (gameTime < TOWERS_FROM_SECONDS || current >= MAX_TOWERS) {
            return current;
        }
        double chance = Math.min(0.5, 0.03 * intervalSeconds);
        return random.nextDouble() < chance ? current + 1 : current;
    }
}
