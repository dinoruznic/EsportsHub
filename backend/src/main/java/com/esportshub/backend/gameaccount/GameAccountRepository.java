package com.esportshub.backend.gameaccount;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GameAccountRepository extends JpaRepository<GameAccount, Long> {
    List<GameAccount> findByUser_Username(String username);
    Optional<GameAccount> findByIdAndUser_Username(Long id, String username);
    boolean existsByUser_UsernameAndGame_Id(String username, Long gameId);
}
