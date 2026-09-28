package com.esportshub.backend.game;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GamePositionRepository extends JpaRepository<GamePosition, Long> {
    List<GamePosition> findByGame_IdOrderByLabel(Long gameId);
    Optional<GamePosition> findByIdAndGame_Id(Long id, Long gameId);
}
