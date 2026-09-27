package com.esportshub.backend.market;

import com.esportshub.backend.gameaccount.GameAccount;
import com.esportshub.backend.gameaccount.GameAccountRepository;
import com.esportshub.backend.gameaccount.MarketStatus;
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
        TransferListing listing = transferListingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Oglas ne postoji"));

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
}
