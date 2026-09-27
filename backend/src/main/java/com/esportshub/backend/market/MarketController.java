package com.esportshub.backend.market;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketController {

    private final MarketService marketService;

    @PostMapping("/listings")
    public ResponseEntity<ListingResponse> create(@AuthenticationPrincipal UserDetails principal,
                                                  @Valid @RequestBody CreateListingRequest request) {
        ListingResponse created = marketService.createListing(principal.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/listings")
    public List<ListingResponse> listOpen(@RequestParam(required = false) Long gameId) {
        return marketService.listOpen(gameId);
    }

    @PostMapping("/listings/{id}/cancel")
    public ListingResponse cancel(@AuthenticationPrincipal UserDetails principal,
                                  @PathVariable Long id) {
        return marketService.cancelListing(principal.getUsername(), id);
    }

    @PostMapping("/listings/{listingId}/offers")
    public ResponseEntity<OfferResponse> makeOffer(@AuthenticationPrincipal UserDetails principal,
                                                   @PathVariable Long listingId,
                                                   @Valid @RequestBody MakeOfferRequest request) {
        OfferResponse created = marketService.makeOffer(principal.getUsername(), listingId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/listings/{listingId}/offers")
    public List<OfferResponse> listOffers(@AuthenticationPrincipal UserDetails principal,
                                          @PathVariable Long listingId) {
        return marketService.listOffers(principal.getUsername(), listingId);
    }

    @PostMapping("/offers/{offerId}/accept")
    public ContractResponse acceptOffer(@AuthenticationPrincipal UserDetails principal,
                                        @PathVariable Long offerId) {
        return marketService.acceptOffer(principal.getUsername(), offerId);
    }
}
