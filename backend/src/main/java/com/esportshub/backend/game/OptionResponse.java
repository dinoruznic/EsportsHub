package com.esportshub.backend.game;

public record OptionResponse(
        Long id,
        String code,
        String label
) {
    public static OptionResponse from(GameRegion region) {
        return new OptionResponse(region.getId(), region.getCode(), region.getLabel());
    }

    public static OptionResponse from(GamePosition position) {
        return new OptionResponse(position.getId(), position.getCode(), position.getLabel());
    }

    public static OptionResponse from(GameRank rank) {
        return new OptionResponse(rank.getId(), rank.getCode(), rank.getLabel());
    }
}
