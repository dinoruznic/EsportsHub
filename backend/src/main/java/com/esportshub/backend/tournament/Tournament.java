package com.esportshub.backend.tournament;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "tournaments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tournament {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(nullable = false, length = 20)
    private String format;

    @Column(name = "max_teams")
    private Integer maxTeams;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 14)
    private TournamentStatus status;

    @Column(name = "prize_pool")
    private Integer prizePool;

    @Column(name = "start_date")
    private Instant startDate;

    @ManyToOne(optional = false)
    @JoinColumn(name = "organizer_id", nullable = false)
    private User organizer;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        if (status == null) {
            status = TournamentStatus.PENDING;
        }
    }
}
