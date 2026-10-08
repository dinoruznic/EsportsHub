package com.esportshub.backend.match;

import com.esportshub.backend.bracket.Match;
import com.esportshub.backend.bracket.TeamBrief;

import java.time.Instant;

public record LiveMatchResponse(
        Long matchId,
        String status,
        Long tournamentId,
        String tournamentName,
        String gameCode,
        Integer roundNumber,
        String roundName,
        TeamBrief teamA,
        TeamBrief teamB,
        Integer scoreA,
        Integer scoreB,
        Instant startedAt
) {
    public static LiveMatchResponse from(Match match) {
        return new LiveMatchResponse(
                match.getId(),
                match.getStatus().name(),
                match.getTournament().getId(),
                match.getTournament().getName(),
                match.getTournament().getGame().getCode(),
                match.getRound() == null ? null : match.getRound().getRoundNumber(),
                match.getRound() == null ? null : match.getRound().getName(),
                TeamBrief.from(match.getTeamA()),
                TeamBrief.from(match.getTeamB()),
                match.getScoreA(),
                match.getScoreB(),
                match.getStartedAt());
    }
}
