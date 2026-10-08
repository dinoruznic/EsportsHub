package com.esportshub.backend.profile;

import com.esportshub.backend.team.Team;

public record PlayerTeamResponse(
        Long id,
        String name,
        String tag,
        String gameCode,
        boolean captain
) {
    public static PlayerTeamResponse from(Team team, String username) {
        return new PlayerTeamResponse(
                team.getId(),
                team.getName(),
                team.getTag(),
                team.getGame().getCode(),
                team.getCaptain().getUsername().equals(username));
    }
}
