package com.esportshub.backend.market;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MyMarketController {

    private final MarketService marketService;

    @GetMapping("/offers")
    public List<MyOfferResponse> myOffers(@AuthenticationPrincipal UserDetails principal) {
        return marketService.listMyOffers(principal.getUsername());
    }
}
