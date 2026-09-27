package com.esportshub.backend.market;

import com.esportshub.backend.team.Team;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "transfer_offers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "listing_id", nullable = false)
    private TransferListing listing;

    @ManyToOne(optional = false)
    @JoinColumn(name = "from_team_id", nullable = false)
    private Team fromTeam;

    @Column(name = "amount")
    private Integer amount;

    @Column(name = "message", length = 255)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private OfferStatus status;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        if (status == null) {
            status = OfferStatus.PENDING;
        }
    }
}
