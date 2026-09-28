package com.esportshub.backend.bracket;

import com.esportshub.backend.team.Team;

public record TeamBrief(
        Long id,
        String name,
        String tag
) {
    public static TeamBrief from(Team team) {
        return team == null ? null : new TeamBrief(team.getId(), team.getName(), team.getTag());
    }
}
