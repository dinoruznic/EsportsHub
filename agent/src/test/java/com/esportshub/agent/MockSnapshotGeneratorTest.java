package com.esportshub.agent;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MockSnapshotGeneratorTest {

    @Test
    void valuesGrowOverTime() {
        int interval = 5;
        MockSnapshotGenerator generator = new MockSnapshotGenerator("kljuc", interval, new Random(42));
        LiveSnapshotMessage previous = generator.next(Instant.now());

        for (int i = 2; i <= 360; i++) {
            LiveSnapshotMessage current = generator.next(Instant.now());

            assertEquals("kljuc", current.matchKey());
            assertEquals(i * interval, current.gameTimeSeconds());
            assertTrue(current.killsA() >= previous.killsA());
            assertTrue(current.killsB() >= previous.killsB());
            assertTrue(current.goldA() > previous.goldA());
            assertTrue(current.goldB() > previous.goldB());
            assertTrue(current.towersA() >= previous.towersA());
            assertTrue(current.towersB() >= previous.towersB());
            assertTrue(current.towersA() <= 11 && current.towersB() <= 11);

            previous = current;
        }

        assertTrue(previous.killsA() + previous.killsB() > 0);
        assertTrue(previous.towersA() + previous.towersB() > 0);
    }

    @Test
    void startsFromTheGivenGameTimeWithPlausibleState() {
        MockSnapshotGenerator generator = new MockSnapshotGenerator("kljuc", 2, new Random(11), 840);
        LiveSnapshotMessage first = generator.next(Instant.now());

        assertEquals(842, first.gameTimeSeconds());
        assertTrue(first.killsA() >= 3 && first.killsA() <= 13, "kills A " + first.killsA());
        assertTrue(first.killsB() >= 3 && first.killsB() <= 13, "kills B " + first.killsB());
        assertTrue(first.goldA() >= 2500 + 400 * 14, "gold A " + first.goldA());
        assertTrue(first.goldB() >= 2500 + 400 * 14, "gold B " + first.goldB());
        assertTrue(first.goldA() <= 2500 + 400 * 14 + 1300, "gold A " + first.goldA());
        assertTrue(first.goldB() <= 2500 + 400 * 14 + 1300, "gold B " + first.goldB());
        assertTrue(first.goldA() != first.goldB());
        assertTrue(first.towersA() <= 4 && first.towersB() <= 4);

        LiveSnapshotMessage second = generator.next(Instant.now());
        assertEquals(844, second.gameTimeSeconds());
        assertTrue(second.goldA() > first.goldA());
    }

    @Test
    void sameSeedGivesTheSameStart() {
        LiveSnapshotMessage a = new MockSnapshotGenerator("kljuc", 2, new Random(99), 900).next(Instant.EPOCH);
        LiveSnapshotMessage b = new MockSnapshotGenerator("kljuc", 2, new Random(99), 900).next(Instant.EPOCH);

        assertEquals(a, b);
    }

    @Test
    void earlyStartHasNoTowers() {
        LiveSnapshotMessage message = new MockSnapshotGenerator("kljuc", 2, new Random(3), 300).next(Instant.now());

        assertEquals(302, message.gameTimeSeconds());
        assertEquals(0, message.towersA());
        assertEquals(0, message.towersB());
    }

    @Test
    void noTowersBeforeTenMinutes() {
        MockSnapshotGenerator generator = new MockSnapshotGenerator("kljuc", 5, new Random(7));
        for (int i = 1; i < 120; i++) {
            LiveSnapshotMessage message = generator.next(Instant.now());
            assertEquals(0, message.towersA());
            assertEquals(0, message.towersB());
        }
    }
}
