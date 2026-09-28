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
    void noTowersBeforeTenMinutes() {
        MockSnapshotGenerator generator = new MockSnapshotGenerator("kljuc", 5, new Random(7));
        for (int i = 1; i < 120; i++) {
            LiveSnapshotMessage message = generator.next(Instant.now());
            assertEquals(0, message.towersA());
            assertEquals(0, message.towersB());
        }
    }
}
