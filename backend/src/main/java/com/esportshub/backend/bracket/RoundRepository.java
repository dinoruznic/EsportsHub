package com.esportshub.backend.bracket;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoundRepository extends JpaRepository<Round, Long> {
    List<Round> findByTournament_IdOrderByRoundNumber(Long tournamentId);
}
