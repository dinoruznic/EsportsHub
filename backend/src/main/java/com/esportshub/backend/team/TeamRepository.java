package com.esportshub.backend.team;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByGame_Id(Long gameId);
    List<Team> findByCaptain_Username(String username);
    boolean existsByName(String name);
    boolean existsByTag(String tag);
    Optional<Team> findByTag(String tag);
}
