package com.esportshub.backend.tournament;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record CreateTournamentRequest(
        @NotBlank @Size(max = 80) String name,
        @NotNull Long gameId,
        @NotBlank @Size(max = 20) String format,
        @NotNull Integer maxTeams,
        @PositiveOrZero Integer prizePool,
        Instant startDate
) {
}
