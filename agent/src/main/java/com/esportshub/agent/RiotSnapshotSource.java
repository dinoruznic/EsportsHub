package com.esportshub.agent;

import tools.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.Optional;

public class RiotSnapshotSource implements SnapshotSource {

    private static final int MISSES_UNTIL_FINISHED = 3;

    private final RiotClient client;
    private final AgentConfig config;
    private boolean gameSeen;
    private int misses;
    private boolean finished;

    public RiotSnapshotSource(RiotClient client, AgentConfig config) {
        this.client = client;
        this.config = config;
    }

    @Override
    public Optional<LiveSnapshotMessage> next() {
        Optional<JsonNode> data;
        try {
            data = client.fetchAllGameData();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }

        if (data.isPresent()) {
            if (!gameSeen) {
                Log.info("partija pronadjena");
            }
            gameSeen = true;
            misses = 0;
            return Optional.of(RiotSnapshotMapper.map(data.get(), config.matchKey(), config.sideA(), Instant.now()));
        }

        if (!gameSeen) {
            Log.info("cekam partiju...");
            return Optional.empty();
        }

        misses++;
        if (misses >= MISSES_UNTIL_FINISHED) {
            Log.info("partija zavrsena");
            finished = true;
        } else {
            Log.info("League klijent ne odgovara (" + misses + "/" + MISSES_UNTIL_FINISHED + ")");
        }
        return Optional.empty();
    }

    @Override
    public boolean finished() {
        return finished;
    }
}
