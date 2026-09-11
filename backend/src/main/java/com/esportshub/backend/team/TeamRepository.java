package com.esportshub.backend.team;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByGame_Id(Long gameId);
    boolean existsByName(String name);
    boolean existsByTag(String tag);
}
