package com.esportshub.backend.user;

import jakarta.persistence.*;
import lombok.*;

/** Uloga (SPECTATOR, PLAYER, CAPTAIN, REFEREE, ADMIN) - punjena kroz Liquibase seed. */
@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String name;
}
