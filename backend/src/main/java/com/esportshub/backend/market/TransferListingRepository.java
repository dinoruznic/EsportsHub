package com.esportshub.backend.market;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransferListingRepository extends JpaRepository<TransferListing, Long> {
    List<TransferListing> findByStatus(ListingStatus status);
    List<TransferListing> findByStatusAndGameAccount_Game_Id(ListingStatus status, Long gameId);
    boolean existsByGameAccount_IdAndStatus(Long gameAccountId, ListingStatus status);
}
