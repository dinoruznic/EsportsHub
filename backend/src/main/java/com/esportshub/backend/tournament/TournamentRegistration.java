package com.esportshub.backend.tournament;

import com.esportshub.backend.team.Team;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "tournament_registrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TournamentRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne(optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private RegistrationStatus status;

    @Column(name = "seed")
    private Integer seed;

    @Column(name = "registered_at")
    private Instant registeredAt;

    @PrePersist
    void onCreate() {
        registeredAt = Instant.now();
        if (status == null) {
            status = RegistrationStatus.REGISTERED;
        }
    }
}
