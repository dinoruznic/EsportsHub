package com.esportshub.backend.market;

import com.esportshub.backend.gameaccount.GameAccount;
import com.esportshub.backend.gameaccount.GameAccountRepository;
import com.esportshub.backend.gameaccount.MarketStatus;
import com.esportshub.backend.team.Team;
import com.esportshub.backend.team.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MarketService {

    private final TransferListingRepository transferListingRepository;
    private final GameAccountRepository gameAccountRepository;
    private final TransferOfferRepository transferOfferRepository;
    private final TeamRepository teamRepository;

    public ListingResponse createListing(String username, CreateListingRequest request) {
        GameAccount account = gameAccountRepository.findById(request.gameAccountId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nalog ne postoji"));

        if (!account.getUser().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "nije tvoj nalog");
        }

        if (transferListingRepository.existsByGameAccount_IdAndStatus(account.getId(), ListingStatus.OPEN)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "vec je na trzistu");
        }

        TransferListing listing = TransferListing.builder()
                .gameAccount(account)
                .askingPrice(request.askingPrice())
                .status(ListingStatus.OPEN)
                .build();

        account.setMarketStatus(MarketStatus.AVAILABLE);
        gameAccountRepository.save(account);

        return ListingResponse.from(transferListingRepository.save(listing));
    }

    @Transactional(readOnly = true)
    public List<ListingResponse> listOpen(Long gameId) {
        List<TransferListing> listings = gameId != null
                ? transferListingRepository.findByStatusAndGameAccount_Game_Id(ListingStatus.OPEN, gameId)
                : transferListingRepository.findByStatus(ListingStatus.OPEN);

        return listings.stream()
                .map(ListingResponse::from)
                .toList();
    }

    public ListingResponse cancelListing(String username, Long id) {
        TransferListing listing = transferListingRepository.findById(id).orElseThrow(MarketService::listingNotFound);

        GameAccount account = listing.getGameAccount();

        if (!account.getUser().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "nije tvoj nalog");
        }

        if (listing.getStatus() != ListingStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "oglas nije otvoren");
        }

        listing.setStatus(ListingStatus.CANCELLED);
        listing.setClosedAt(Instant.now());
        account.setMarketStatus(MarketStatus.INACTIVE);
        gameAccountRepository.save(account);

        return ListingResponse.from(transferListingRepository.save(listing));
    }

    public OfferResponse makeOffer(String username, Long listingId, MakeOfferRequest request) {
        TransferListing listing = transferListingRepository.findById(listingId).orElseThrow(MarketService::listingNotFound);

        if (listing.getStatus() != ListingStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "oglas nije otvoren");
        }

        Team team = teamRepository.findById(request.teamId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "tim ne postoji"));

        if (!team.getCaptain().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "nisi kapiten tima");
        }

        GameAccount account = listing.getGameAccount();

        if (!team.getGame().getId().equals(account.getGame().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tim i igrac nisu ista igra");
        }

        if (account.getUser().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ne mozes ponuditi na svoj oglas");
        }

        TransferOffer offer = TransferOffer.builder()
                .listing(listing)
                .fromTeam(team)
                .amount(request.amount())
                .message(request.message())
                .status(OfferStatus.PENDING)
                .build();

        return OfferResponse.from(transferOfferRepository.save(offer));
    }

    @Transactional(readOnly = true)
    public List<OfferResponse> listOffers(String username, Long listingId) {
        TransferListing listing = transferListingRepository.findById(listingId).orElseThrow(MarketService::listingNotFound);

        if (!listing.getGameAccount().getUser().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "nisi vlasnik oglasa");
        }

        return transferOfferRepository.findByListing_Id(listingId).stream()
                .map(OfferResponse::from)
                .toList();
    }

    private static ResponseStatusException listingNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Oglas ne postoji");
    }
}
