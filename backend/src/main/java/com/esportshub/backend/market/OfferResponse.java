package com.esportshub.backend.market;

import java.time.Instant;

public record OfferResponse(
        Long id,
        Long listingId,
        Long fromTeamId,
        String fromTeamName,
        Integer amount,
        String message,
        String status,
        Instant createdAt,
        Instant respondedAt
) {
    public static OfferResponse from(TransferOffer offer) {
        return new OfferResponse(
                offer.getId(),
                offer.getListing().getId(),
                offer.getFromTeam().getId(),
                offer.getFromTeam().getName(),
                offer.getAmount(),
                offer.getMessage(),
                offer.getStatus().name(),
                offer.getCreatedAt(),
                offer.getRespondedAt());
    }
}
