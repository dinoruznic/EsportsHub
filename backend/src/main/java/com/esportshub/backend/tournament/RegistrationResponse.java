package com.esportshub.backend.tournament;

import java.time.Instant;

public record RegistrationResponse(
        Long id,
        Long tournamentId,
        Long teamId,
        String teamName,
        String teamTag,
        String status,
        Integer seed,
        Instant registeredAt
) {
    public static RegistrationResponse from(TournamentRegistration registration) {
        return new RegistrationResponse(
                registration.getId(),
                registration.getTournament().getId(),
                registration.getTeam().getId(),
                registration.getTeam().getName(),
                registration.getTeam().getTag(),
                registration.getStatus().name(),
                registration.getSeed(),
                registration.getRegisteredAt());
    }
}
