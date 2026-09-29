package com.esportshub.backend.market;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.gameaccount.GameAccount;
import com.esportshub.backend.gameaccount.GameAccountRepository;
import com.esportshub.backend.gameaccount.MarketStatus;
import com.esportshub.backend.support.TestData;
import com.esportshub.backend.team.Team;
import com.esportshub.backend.team.TeamMembership;
import com.esportshub.backend.team.TeamMembershipRepository;
import com.esportshub.backend.team.TeamRepository;
import com.esportshub.backend.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static com.esportshub.backend.support.ApiAssertions.assertStatus;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketServiceTest {

    @Mock
    private TransferListingRepository transferListingRepository;
    @Mock
    private GameAccountRepository gameAccountRepository;
    @Mock
    private TransferOfferRepository transferOfferRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private TeamMembershipRepository teamMembershipRepository;

    @InjectMocks
    private MarketService marketService;

    private Game lol;
    private User seller;
    private User captain;
    private GameAccount account;
    private TransferListing listing;
    private Team buyer;
    private TransferOffer offer;
    private TransferOffer rivalOffer;
    private TransferOffer thirdOffer;

    @BeforeEach
    void setUp() {
        lol = TestData.game(1L, "LOL", "TIER");
        seller = TestData.user(1L, "seller");
        captain = TestData.user(2L, "cap");
        account = GameAccount.builder()
                .id(5L)
                .user(seller)
                .game(lol)
                .inGameName("Seller#EUW")
                .marketStatus(MarketStatus.AVAILABLE)
                .build();
        listing = TransferListing.builder()
                .id(50L)
                .gameAccount(account)
                .askingPrice(900)
                .status(ListingStatus.OPEN)
                .build();
        buyer = TestData.team(7L, "Kupci", lol, captain);
        offer = offer(500L, buyer, 1000);
        rivalOffer = offer(501L, TestData.team(8L, "Rival", lol, TestData.user(3L, "rival")), 1100);
        thirdOffer = offer(502L, TestData.team(9L, "Treci", lol, TestData.user(4L, "treci")), 800);
    }

    @Test
    void acceptOfferCreatesActiveContractWithOfferAmountAsSalary() {
        readyToAccept(false);

        ContractResponse contract = marketService.acceptOffer("seller", offer.getId());

        assertThat(contract.status()).isEqualTo("ACTIVE");
        assertThat(contract.salary()).isEqualTo(1000);
        assertThat(contract.teamId()).isEqualTo(buyer.getId());
        assertThat(contract.gameAccountId()).isEqualTo(account.getId());
        assertThat(contract.startDate()).isNotNull();
    }

    @Test
    void acceptOfferAddsPlayerToBuyingTeam() {
        readyToAccept(false);

        marketService.acceptOffer("seller", offer.getId());

        ArgumentCaptor<TeamMembership> membership = ArgumentCaptor.forClass(TeamMembership.class);
        verify(teamMembershipRepository).save(membership.capture());
        assertThat(membership.getValue().getTeam()).isEqualTo(buyer);
        assertThat(membership.getValue().getGameAccount()).isEqualTo(account);
        assertThat(membership.getValue().isActive()).isTrue();
    }

    @Test
    void acceptOfferDoesNotDuplicateExistingActiveMembership() {
        readyToAccept(true);

        marketService.acceptOffer("seller", offer.getId());

        verify(teamMembershipRepository, never()).save(any());
    }

    @Test
    void acceptOfferClosesListingAndDeactivatesAccount() {
        readyToAccept(false);

        marketService.acceptOffer("seller", offer.getId());

        assertThat(listing.getStatus()).isEqualTo(ListingStatus.CLOSED);
        assertThat(listing.getClosedAt()).isNotNull();
        assertThat(account.getMarketStatus()).isEqualTo(MarketStatus.INACTIVE);
        verify(transferListingRepository).save(listing);
        verify(gameAccountRepository).save(account);
    }

    @Test
    void acceptOfferRejectsEveryOtherPendingOffer() {
        readyToAccept(false);

        marketService.acceptOffer("seller", offer.getId());

        assertThat(offer.getStatus()).isEqualTo(OfferStatus.ACCEPTED);
        assertThat(rivalOffer.getStatus()).isEqualTo(OfferStatus.REJECTED);
        assertThat(thirdOffer.getStatus()).isEqualTo(OfferStatus.REJECTED);
        assertThat(List.of(offer, rivalOffer, thirdOffer)).allSatisfy(o -> assertThat(o.getRespondedAt()).isNotNull());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TransferOffer>> rejected = ArgumentCaptor.forClass(List.class);
        verify(transferOfferRepository).saveAll(rejected.capture());
        assertThat(rejected.getValue()).containsExactlyInAnyOrder(rivalOffer, thirdOffer);
    }

    @Test
    void onlyListingOwnerCanAcceptOffer() {
        when(transferOfferRepository.findById(offer.getId())).thenReturn(Optional.of(offer));

        assertStatus(() -> marketService.acceptOffer("cap", offer.getId()), HttpStatus.FORBIDDEN);
        verify(contractRepository, never()).save(any());
    }

    @Test
    void acceptingNonPendingOfferIsConflict() {
        offer.setStatus(OfferStatus.WITHDRAWN);
        when(transferOfferRepository.findById(offer.getId())).thenReturn(Optional.of(offer));

        assertStatus(() -> marketService.acceptOffer("seller", offer.getId()), HttpStatus.CONFLICT, "ponuda nije aktivna");
        verify(contractRepository, never()).save(any());
    }

    @Test
    void acceptingOfferOnClosedListingIsConflict() {
        listing.setStatus(ListingStatus.CLOSED);
        when(transferOfferRepository.findById(offer.getId())).thenReturn(Optional.of(offer));

        assertStatus(() -> marketService.acceptOffer("seller", offer.getId()), HttpStatus.CONFLICT, "oglas nije otvoren");
        assertThat(offer.getStatus()).isEqualTo(OfferStatus.PENDING);
    }

    @Test
    void makeOfferCreatesPendingOffer() {
        when(transferListingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));
        when(teamRepository.findById(buyer.getId())).thenReturn(Optional.of(buyer));
        when(transferOfferRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        OfferResponse response = marketService.makeOffer("cap", listing.getId(), new MakeOfferRequest(buyer.getId(), 1200, "dodji"));

        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.amount()).isEqualTo(1200);
        assertThat(response.fromTeamId()).isEqualTo(buyer.getId());
    }

    @Test
    void makeOfferRequiresTeamCaptain() {
        when(transferListingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));
        when(teamRepository.findById(buyer.getId())).thenReturn(Optional.of(buyer));

        assertStatus(() -> marketService.makeOffer("neko", listing.getId(), new MakeOfferRequest(buyer.getId(), 1200, null)),
                HttpStatus.FORBIDDEN, "nisi kapiten");
    }

    @Test
    void makeOfferRejectsTeamFromAnotherGame() {
        Team csTeam = TestData.team(11L, "CS", TestData.game(2L, "CS2", "NUMERIC"), captain);
        when(transferListingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));
        when(teamRepository.findById(csTeam.getId())).thenReturn(Optional.of(csTeam));

        assertStatus(() -> marketService.makeOffer("cap", listing.getId(), new MakeOfferRequest(csTeam.getId(), 1200, null)),
                HttpStatus.BAD_REQUEST, "nisu ista igra");
    }

    @Test
    void makeOfferOnOwnListingIsBadRequest() {
        Team sellersTeam = TestData.team(12L, "Moj tim", lol, seller);
        when(transferListingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));
        when(teamRepository.findById(sellersTeam.getId())).thenReturn(Optional.of(sellersTeam));

        assertStatus(() -> marketService.makeOffer("seller", listing.getId(), new MakeOfferRequest(sellersTeam.getId(), 1200, null)),
                HttpStatus.BAD_REQUEST, "svoj oglas");
        verify(transferOfferRepository, never()).save(any());
    }

    private TransferOffer offer(Long id, Team team, int amount) {
        return TransferOffer.builder()
                .id(id)
                .listing(listing)
                .fromTeam(team)
                .amount(amount)
                .status(OfferStatus.PENDING)
                .build();
    }

    private void readyToAccept(boolean alreadyMember) {
        when(transferOfferRepository.findById(offer.getId())).thenReturn(Optional.of(offer));
        when(contractRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(teamMembershipRepository.existsByTeam_IdAndGameAccount_IdAndActiveTrue(buyer.getId(), account.getId()))
                .thenReturn(alreadyMember);
        when(transferOfferRepository.findByListing_IdAndStatus(listing.getId(), OfferStatus.PENDING))
                .thenReturn(List.of(offer, rivalOffer, thirdOffer));
    }
}
