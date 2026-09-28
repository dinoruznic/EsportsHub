package com.esportshub.backend.team;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTeamRequest(
        @NotBlank @Size(max = 60) String name,
        @NotBlank @Size(max = 5) String tag,
        @NotNull Long gameId,
        @Size(max = 10) String region,
        @Size(max = 255) String logoUrl
) {
}
