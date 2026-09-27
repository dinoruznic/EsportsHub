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
@RequestMapping("/api/market/listings")
@RequiredArgsConstructor
public class MarketController {

    private final MarketService marketService;

    @PostMapping("")
    public ResponseEntity<ListingResponse> create(@AuthenticationPrincipal UserDetails principal,
                                                  @Valid @RequestBody CreateListingRequest request) {
        ListingResponse created = marketService.createListing(principal.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("")
    public List<ListingResponse> listOpen(@RequestParam(required = false) Long gameId) {
        return marketService.listOpen(gameId);
    }

    @PostMapping("/{id}/cancel")
    public ListingResponse cancel(@AuthenticationPrincipal UserDetails principal,
                                  @PathVariable Long id) {
        return marketService.cancelListing(principal.getUsername(), id);
    }
}
