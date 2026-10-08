package com.esportshub.agent;

import java.time.Instant;
import java.util.Optional;
import java.util.Random;

public class MockSnapshotSource implements SnapshotSource {

    private final MockSnapshotGenerator generator;

    public MockSnapshotSource(AgentConfig config) {
        this.generator = new MockSnapshotGenerator(
                config.matchKey(), config.intervalSeconds(), new Random(), config.startSeconds());
    }

    @Override
    public Optional<LiveSnapshotMessage> next() {
        return Optional.of(generator.next(Instant.now()));
    }
}
