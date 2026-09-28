package com.esportshub.backend.bracket;

import com.esportshub.backend.tournament.Tournament;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rounds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Round {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @Column(name = "round_number", nullable = false)
    private Integer roundNumber;

    @Column(name = "name", length = 30)
    private String name;

    @Column(name = "bracket_side", length = 8)
    private String bracketSide;
}
