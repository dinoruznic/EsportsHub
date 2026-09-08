package com.esportshub.backend.tournament;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface TournamentRepository extends JpaRepository<Tournament, Long> {
    List<Tournament> findByStatusIn(Collection<TournamentStatus> statuses);
}
