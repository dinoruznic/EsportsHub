package com.esportshub.backend.tournament;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TournamentRegistrationRepository extends JpaRepository<TournamentRegistration, Long> {
    List<TournamentRegistration> findByTournament_Id(Long tournamentId);
    List<TournamentRegistration> findByTournament_IdAndStatusOrderByRegisteredAtAsc(Long tournamentId, RegistrationStatus status);
    Optional<TournamentRegistration> findByTournament_IdAndTeam_Id(Long tournamentId, Long teamId);
    boolean existsByTournament_IdAndTeam_IdAndStatus(Long tournamentId, Long teamId, RegistrationStatus status);
    long countByTournament_IdAndStatus(Long tournamentId, RegistrationStatus status);
}
