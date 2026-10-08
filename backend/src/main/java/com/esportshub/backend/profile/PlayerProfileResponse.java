package com.esportshub.backend.profile;

import java.time.Instant;
import java.util.List;

public record PlayerProfileResponse(
        String username,
        String displayName,
        List<String> roles,
        Instant createdAt,
        List<PlayerTeamResponse> teams
) {
}
