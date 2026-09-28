package com.esportshub.backend.admin;

import jakarta.validation.constraints.NotBlank;

public record RoleGrantRequest(
        @NotBlank String role
) {
}
