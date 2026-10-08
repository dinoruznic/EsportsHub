package com.esportshub.backend.bracket;

public record MatchView(
        Long id,
        String status,
        TeamBrief teamA,
        TeamBrief teamB,
        Integer scoreA,
        Integer scoreB,
        Long winnerTeamId,
        Long nextMatchId,
        Long tournamentId,
        String tournamentName,
        String gameCode,
        String roundName
) {
    public static MatchView from(Match match) {
        return new MatchView(
                match.getId(),
                match.getStatus().name(),
                TeamBrief.from(match.getTeamA()),
                TeamBrief.from(match.getTeamB()),
                match.getScoreA(),
                match.getScoreB(),
                match.getWinnerTeam() == null ? null : match.getWinnerTeam().getId(),
                match.getNextMatchId(),
                match.getTournament().getId(),
                match.getTournament().getName(),
                match.getTournament().getGame().getCode(),
                match.getRound() == null ? null : match.getRound().getName());
    }
}
