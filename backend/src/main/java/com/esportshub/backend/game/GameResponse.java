package com.esportshub.backend.game;

public record GameResponse(
        Long id,
        String code,
        String name,
        boolean hasLiveApi
) {
    public static GameResponse from(Game game) {
        return new GameResponse(
                game.getId(),
                game.getCode(),
                game.getName(),
                game.isHasLiveApi());
    }
}
