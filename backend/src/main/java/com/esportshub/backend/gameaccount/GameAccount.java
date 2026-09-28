package com.esportshub.backend.gameaccount;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.game.GamePosition;
import com.esportshub.backend.game.GameRank;
import com.esportshub.backend.game.GameRegion;
import com.esportshub.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "game_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "in_game_name", nullable = false, length = 60)
    private String inGameName;

    @Column(name = "external_id", length = 80)
    private String externalId;

    @ManyToOne
    @JoinColumn(name = "region_id")
    private GameRegion region;

    @ManyToOne
    @JoinColumn(name = "position_id")
    private GamePosition position;

    @ManyToOne
    @JoinColumn(name = "rank_id")
    private GameRank rank;

    @Column(name = "rating")
    private Integer rating;

    @Enumerated(EnumType.STRING)
    @Column(name = "market_status", nullable = false, length = 12)
    private MarketStatus marketStatus;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        if (marketStatus == null) {
            marketStatus = MarketStatus.INACTIVE;
        }
    }
}
