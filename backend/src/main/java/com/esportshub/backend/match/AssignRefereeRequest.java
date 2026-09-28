package com.esportshub.backend.match;

import jakarta.validation.constraints.NotBlank;

public record AssignRefereeRequest(
        @NotBlank String username
) {
}
