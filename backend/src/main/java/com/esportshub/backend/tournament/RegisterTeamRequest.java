package com.esportshub.backend.tournament;

import jakarta.validation.constraints.NotNull;

public record RegisterTeamRequest(
        @NotNull Long teamId
) {
}
