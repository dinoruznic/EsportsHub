package com.esportshub.backend.match;

import com.esportshub.backend.bracket.Match;
import com.esportshub.backend.bracket.TeamBrief;

import java.time.Instant;

public record RefereeMatchResponse(
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
        Long winnerTeamId,
        Long nextMatchId,
        String refereeUsername,
        Instant startedAt,
        Instant endedAt,
        Instant lastSnapshotAt
) {
    public static RefereeMatchResponse from(Match match, Instant lastSnapshotAt) {
        return new RefereeMatchResponse(
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
                match.getWinnerTeam() == null ? null : match.getWinnerTeam().getId(),
                match.getNextMatchId(),
                match.getReferee() == null ? null : match.getReferee().getUsername(),
                match.getStartedAt(),
                match.getEndedAt(),
                lastSnapshotAt);
    }
}
