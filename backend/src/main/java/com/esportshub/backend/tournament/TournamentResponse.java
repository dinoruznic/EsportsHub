package com.esportshub.backend.tournament;

import java.time.Instant;

public record TournamentResponse(
        Long id,
        String name,
        String gameCode,
        String format,
        Integer maxTeams,
        String status,
        Integer prizePool,
        Instant startDate,
        String organizerUsername,
        Instant createdAt
) {
    public static TournamentResponse from(Tournament tournament) {
        return new TournamentResponse(
                tournament.getId(),
                tournament.getName(),
                tournament.getGame().getCode(),
                tournament.getFormat(),
                tournament.getMaxTeams(),
                tournament.getStatus().name(),
                tournament.getPrizePool(),
                tournament.getStartDate(),
                tournament.getOrganizer().getUsername(),
                tournament.getCreatedAt());
    }
}
