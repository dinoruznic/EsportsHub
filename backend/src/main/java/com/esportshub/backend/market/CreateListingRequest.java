package com.esportshub.backend.market;

import jakarta.validation.constraints.NotNull;

public record CreateListingRequest(
        @NotNull Long gameAccountId,
        Integer askingPrice
) {
}
