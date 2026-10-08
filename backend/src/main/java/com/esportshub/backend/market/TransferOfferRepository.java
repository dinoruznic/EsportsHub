package com.esportshub.backend.market;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransferOfferRepository extends JpaRepository<TransferOffer, Long> {
    List<TransferOffer> findByListing_Id(Long listingId);
    List<TransferOffer> findByListing_IdAndStatus(Long listingId, OfferStatus status);
    long countByListing_IdAndStatus(Long listingId, OfferStatus status);
    List<TransferOffer> findByFromTeam_Captain_UsernameOrderByCreatedAtDescIdDesc(String username);
}
