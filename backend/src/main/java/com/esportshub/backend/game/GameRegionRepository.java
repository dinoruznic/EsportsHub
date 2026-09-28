package com.esportshub.backend.game;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GameRegionRepository extends JpaRepository<GameRegion, Long> {
    List<GameRegion> findByGame_IdOrderByLabel(Long gameId);
    Optional<GameRegion> findByIdAndGame_Id(Long id, Long gameId);
}
