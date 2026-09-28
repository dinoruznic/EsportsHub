package com.esportshub.agent;

public enum Side {
    ORDER,
    CHAOS;

    public Side opposite() {
        return this == ORDER ? CHAOS : ORDER;
    }
}
