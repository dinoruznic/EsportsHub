package com.esportshub.backend.team;

import java.util.List;

public record TeamDetailResponse(
        TeamResponse team,
        List<TeamMemberResponse> members
) {
}
