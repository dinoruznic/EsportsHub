package com.esportshub.backend.live;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LiveGameSnapshotRepository extends JpaRepository<LiveGameSnapshot, Long> {
    Optional<LiveGameSnapshot> findTopByMatch_IdOrderByIdDesc(Long matchId);
}
