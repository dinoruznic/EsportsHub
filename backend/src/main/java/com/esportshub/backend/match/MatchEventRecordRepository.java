package com.esportshub.backend.match;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MatchEventRecordRepository extends JpaRepository<MatchEventRecord, Long> {
    List<MatchEventRecord> findByMatchIdOrderByCreatedAtAscIdAsc(Long matchId);
}
