package com.esportshub.backend.bracket;

import com.esportshub.backend.tournament.TournamentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<Match, Long> {
    List<Match> findByTournament_IdOrderByRound_RoundNumberAscIdAsc(Long tournamentId);
    boolean existsByTournament_Id(Long tournamentId);
    List<Match> findByNextMatchIdOrderByIdAsc(Long nextMatchId);
    Optional<Match> findBySpectatorKey(String spectatorKey);
    List<Match> findByStatusOrderByStartedAtAscIdAsc(MatchStatus status);
    List<Match> findByReferee_UsernameOrderByIdDesc(String username);
    List<Match> findByStatusAndTeamAIsNotNullAndTeamBIsNotNullOrderByIdAsc(MatchStatus status);
    List<Match> findTop10ByStatusAndTeamAIsNotNullAndTeamBIsNotNullAndTournament_StatusOrderByIdAsc(
            MatchStatus status, TournamentStatus tournamentStatus);
}
