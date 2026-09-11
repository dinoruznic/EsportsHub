package com.esportshub.backend.team;

import com.esportshub.backend.gameaccount.GameAccount;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "team_memberships")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_account_id", nullable = false)
    private GameAccount gameAccount;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_in_team", length = 10)
    private TeamRole roleInTeam;

    @Column(name = "active")
    private boolean active;

    @Column(name = "joined_at")
    private Instant joinedAt;

    @Column(name = "left_at")
    private Instant leftAt;

    @PrePersist
    void onCreate() {
        joinedAt = Instant.now();
        active = true;
    }
}
