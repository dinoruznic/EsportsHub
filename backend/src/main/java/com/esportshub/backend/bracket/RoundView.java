package com.esportshub.backend.bracket;

import java.util.List;

public record RoundView(
        Integer roundNumber,
        String name,
        List<MatchView> matches
) {
}
