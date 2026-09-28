package com.esportshub.backend.bracket;

import java.util.List;

public record BracketResponse(
        Long tournamentId,
        String tournamentName,
        String status,
        List<RoundView> rounds
) {
}
