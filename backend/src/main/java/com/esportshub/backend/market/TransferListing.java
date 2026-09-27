package com.esportshub.backend.market;

import com.esportshub.backend.gameaccount.GameAccount;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "transfer_listings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_account_id", nullable = false)
    private GameAccount gameAccount;

    @Column(name = "asking_price")
    private Integer askingPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private ListingStatus status;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        if (status == null) {
            status = ListingStatus.OPEN;
        }
    }
}
