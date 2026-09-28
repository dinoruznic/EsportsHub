package com.esportshub.backend.team;

import com.esportshub.backend.gameaccount.GameAccount;

public record TeamMemberResponse(
        Long membershipId,
        Long gameAccountId,
        String inGameName,
        String ownerUsername,
        String rank,
        String position,
        Integer rating,
        String roleInTeam,
        boolean active
) {
    public static TeamMemberResponse from(TeamMembership membership) {
        GameAccount account = membership.getGameAccount();
        return new TeamMemberResponse(
                membership.getId(),
                account.getId(),
                account.getInGameName(),
                account.getUser().getUsername(),
                account.getRank() != null ? account.getRank().getLabel() : null,
                account.getPosition() != null ? account.getPosition().getLabel() : null,
                account.getRating(),
                membership.getRoleInTeam() == null ? null : membership.getRoleInTeam().name(),
                membership.isActive());
    }
}
