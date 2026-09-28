package com.esportshub.backend.market;

import com.esportshub.backend.gameaccount.GameAccount;

import java.time.Instant;

public record ListingResponse(
        Long id,
        Long gameAccountId,
        String ownerUsername,
        String gameCode,
        String inGameName,
        String rank,
        String position,
        Integer rating,
        Integer askingPrice,
        String status,
        Instant createdAt
) {
    public static ListingResponse from(TransferListing listing) {
        GameAccount account = listing.getGameAccount();
        return new ListingResponse(
                listing.getId(),
                account.getId(),
                account.getUser().getUsername(),
                account.getGame().getCode(),
                account.getInGameName(),
                account.getRank() != null ? account.getRank().getLabel() : null,
                account.getPosition() != null ? account.getPosition().getLabel() : null,
                account.getRating(),
                listing.getAskingPrice(),
                listing.getStatus().name(),
                listing.getCreatedAt());
    }
}
