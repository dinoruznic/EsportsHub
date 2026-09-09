package com.esportshub.backend.gameaccount;

import java.time.Instant;

public record GameAccountResponse(
        Long id,
        String ownerUsername,
        String gameCode,
        String gameName,
        String inGameName,
        String region,
        String rank,
        String position,
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
                account.getRegion(),
                account.getRank(),
                account.getPosition(),
                account.getMarketStatus().name(),
                account.getCreatedAt());
    }
}
