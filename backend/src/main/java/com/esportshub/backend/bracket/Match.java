package com.esportshub.backend.bracket;

import com.esportshub.backend.team.Team;
import com.esportshub.backend.tournament.Tournament;
import com.esportshub.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne
    @JoinColumn(name = "round_id")
    private Round round;

    @ManyToOne
    @JoinColumn(name = "team_a_id")
    private Team teamA;

    @ManyToOne
    @JoinColumn(name = "team_b_id")
    private Team teamB;

    @ManyToOne
    @JoinColumn(name = "referee_id")
    private User referee;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 12)
    private MatchStatus status;

    @Column(name = "score_a")
    private Integer scoreA;

    @Column(name = "score_b")
    private Integer scoreB;

    @ManyToOne
    @JoinColumn(name = "winner_team_id")
    private Team winnerTeam;

    @Column(name = "next_match_id")
    private Long nextMatchId;

    @Column(name = "spectator_key", length = 40)
    private String spectatorKey;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @PrePersist
    void onCreate() {
        if (status == null) {
            status = MatchStatus.SCHEDULED;
        }
        if (scoreA == null) {
            scoreA = 0;
        }
        if (scoreB == null) {
            scoreB = 0;
        }
    }
}
