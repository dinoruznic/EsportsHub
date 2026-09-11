package com.esportshub.backend.team;

import java.time.Instant;

public record TeamResponse(
        Long id,
        String name,
        String tag,
        String logoUrl,
        String region,
        String gameCode,
        String captainUsername,
        Integer budget,
        int memberCount,
        Instant createdAt
) {
    public static TeamResponse from(Team team, int memberCount) {
        return new TeamResponse(
                team.getId(),
                team.getName(),
                team.getTag(),
                team.getLogoUrl(),
                team.getRegion() == null ? null : team.getRegion().name(),
                team.getGame().getCode(),
                team.getCaptain().getUsername(),
                team.getBudget(),
                memberCount,
                team.getCreatedAt());
    }
}
