package com.esportshub.agent;

import java.util.Optional;

public interface SnapshotSource {

    Optional<LiveSnapshotMessage> next();

    default boolean finished() {
        return false;
    }
}
