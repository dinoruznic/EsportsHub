package com.esportshub.backend.market;

import com.esportshub.backend.gameaccount.GameAccount;

import java.time.Instant;

public record MyOfferResponse(
        Long id,
        Long listingId,
        String listingStatus,
        Long teamId,
        String teamName,
        String teamTag,
        Long gameAccountId,
        String inGameName,
        String gameCode,
        String ownerUsername,
        Integer amount,
        String message,
        String status,
        Instant createdAt,
        Instant respondedAt
) {
    public static MyOfferResponse from(TransferOffer offer) {
        TransferListing listing = offer.getListing();
        GameAccount account = listing.getGameAccount();
        return new MyOfferResponse(
                offer.getId(),
                listing.getId(),
                listing.getStatus().name(),
                offer.getFromTeam().getId(),
                offer.getFromTeam().getName(),
                offer.getFromTeam().getTag(),
                account.getId(),
                account.getInGameName(),
                account.getGame().getCode(),
                account.getUser().getUsername(),
                offer.getAmount(),
                offer.getMessage(),
                offer.getStatus().name(),
                offer.getCreatedAt(),
                offer.getRespondedAt());
    }
}
