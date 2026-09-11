package com.esportshub.backend.team;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TeamMembershipRepository extends JpaRepository<TeamMembership, Long> {
    List<TeamMembership> findByTeam_IdAndActiveTrue(Long teamId);
    boolean existsByTeam_IdAndGameAccount_IdAndActiveTrue(Long teamId, Long gameAccountId);
}
