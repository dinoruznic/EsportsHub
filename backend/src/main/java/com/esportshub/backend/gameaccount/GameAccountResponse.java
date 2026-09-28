package com.esportshub.backend.gameaccount;

import java.time.Instant;

public record GameAccountResponse(
        Long id,
        String ownerUsername,
        String gameCode,
        String gameName,
        String inGameName,
        String region,
        String position,
        String rank,
        Integer rating,
        String marketStatus,
        Instant createdAt
) {
    public static GameAccountResponse from(GameAccount account) {
        return new GameAccountResponse(
                account.getId(),
                account.getUser().getUsername(),
                account.getGame().getCode(),
                account.getGame().getName(),
                account.getInGameName(),
                account.getRegion() != null ? account.getRegion().getLabel() : null,
                account.getPosition() != null ? account.getPosition().getLabel() : null,
                account.getRank() != null ? account.getRank().getLabel() : null,
                account.getRating(),
                account.getMarketStatus().name(),
                account.getCreatedAt());
    }
}
