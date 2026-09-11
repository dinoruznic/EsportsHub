package com.esportshub.backend.team;

import jakarta.validation.constraints.NotNull;

public record AddMemberRequest(
        @NotNull Long gameAccountId,
        TeamRole roleInTeam
) {
}
