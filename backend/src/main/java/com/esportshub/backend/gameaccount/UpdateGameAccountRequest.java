package com.esportshub.backend.gameaccount;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateGameAccountRequest(
        @NotBlank @Size(max = 60) String inGameName,
        @Size(max = 10) String region,
        @Size(max = 30) String rank,
        @Size(max = 20) String position,
        @NotNull MarketStatus marketStatus
) {
}
