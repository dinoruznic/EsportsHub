package com.esportshub.backend.demo;

public record DemoResetResponse(
        long users,
        long teams,
        long tournaments,
        long listings
) {
}
