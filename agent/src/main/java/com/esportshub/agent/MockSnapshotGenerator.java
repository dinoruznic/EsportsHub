package com.esportshub.agent;

import java.time.Instant;
import java.util.Map;
import java.util.Random;

public class MockSnapshotGenerator {

    private static final int START_GOLD = 2500;
    private static final int GOLD_PER_MINUTE = 400;
    private static final int MAX_START_TOWERS = 3;
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
        this(matchKey, intervalSeconds, random, 0);
    }

    public MockSnapshotGenerator(String matchKey, int intervalSeconds, Random random, int startSeconds) {
        this.matchKey = matchKey;
        this.intervalSeconds = intervalSeconds;
        this.random = random;
        if (startSeconds > 0) {
            warmUp(startSeconds);
        }
    }

    private void warmUp(int startSeconds) {
        gameTime = startSeconds;
        double minutes = startSeconds / 60.0;
        killsA = startKills(minutes);
        killsB = startKills(minutes);
        int base = START_GOLD + (int) Math.round(GOLD_PER_MINUTE * minutes);
        int lead = (int) Math.round(minutes * (20 + random.nextInt(41)));
        boolean aLeads = random.nextBoolean();
        goldA = base + (aLeads ? lead : 0) + random.nextInt(201);
        goldB = base + (aLeads ? 0 : lead) + random.nextInt(201);
        if (startSeconds >= TOWERS_FROM_SECONDS) {
            towersA = random.nextInt(MAX_START_TOWERS + 1);
            towersB = random.nextInt(MAX_START_TOWERS + 1);
        }
    }

    private int startKills(double minutes) {
        double expected = minutes / 2.0;
        return Math.max(0, (int) Math.round(expected * (0.7 + 0.6 * random.nextDouble())));
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
