package com.esportshub.backend.profile;

import jakarta.validation.constraints.Size;

public record UpdateMeRequest(
        @Size(max = 60) String displayName
) {
}
