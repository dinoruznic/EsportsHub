package com.esportshub.backend.market;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MakeOfferRequest(
        @NotNull Long teamId,
        @NotNull Integer amount,
        @Size(max = 255) String message
) {
}
