package com.esportshub.backend.match;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ScoreRequest(
        @NotNull @Min(0) Integer scoreA,
        @NotNull @Min(0) Integer scoreB
) {
}
