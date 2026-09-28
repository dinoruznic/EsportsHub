package com.esportshub.backend.bracket;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {
    List<Match> findByTournament_IdOrderByRound_RoundNumberAscIdAsc(Long tournamentId);
    boolean existsByTournament_Id(Long tournamentId);
    List<Match> findByNextMatchIdOrderByIdAsc(Long nextMatchId);
}
