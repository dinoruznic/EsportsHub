package com.esportshub.backend.gameaccount;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateGameAccountRequest(
        @NotNull Long gameId,
        @NotBlank @Size(max = 60) String inGameName,
        Long regionId,
        Long positionId,
        Long rankId,
        Integer rating
) {
}
