package com.esportshub.backend.game;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GameRankRepository extends JpaRepository<GameRank, Long> {
    List<GameRank> findByGame_IdOrderByOrdinal(Long gameId);
    Optional<GameRank> findByIdAndGame_Id(Long id, Long gameId);
}
