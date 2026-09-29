package com.esportshub.backend.gameaccount;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.game.GamePositionRepository;
import com.esportshub.backend.game.GameRankRepository;
import com.esportshub.backend.game.GameRegionRepository;
import com.esportshub.backend.game.GameRepository;
import com.esportshub.backend.support.TestData;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static com.esportshub.backend.support.ApiAssertions.assertStatus;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GameAccountServiceTest {

    @Mock
    private GameAccountRepository gameAccountRepository;
    @Mock
    private GameRepository gameRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private GameRegionRepository gameRegionRepository;
    @Mock
    private GamePositionRepository gamePositionRepository;
    @Mock
    private GameRankRepository gameRankRepository;

    @InjectMocks
    private GameAccountService gameAccountService;

    private User player;
    private Game lol;
    private Game cs2;
    private Game chess;

    @BeforeEach
    void setUp() {
        player = TestData.user(1L, "igrac");
        lol = TestData.game(1L, "LOL", "TIER");
        cs2 = TestData.game(2L, "CS2", "NUMERIC");
        chess = TestData.game(3L, "CHESS", "NONE");
    }

    @Test
    void tierGameAcceptsRankFromSameGame() {
        creating(lol);
        savingReturnsAccount();
        when(gameRankRepository.findByIdAndGame_Id(7L, lol.getId())).thenReturn(Optional.of(TestData.rank(7L, lol, "DIAMOND")));

        GameAccountResponse response = gameAccountService.create("igrac", request(lol, null, null, 7L, null));

        assertThat(response.rank()).isEqualTo("DIAMOND");
        assertThat(response.rating()).isNull();
    }

    @Test
    void tierGameRejectsRating() {
        creating(lol);

        assertStatus(() -> gameAccountService.create("igrac", request(lol, null, null, null, 1500)),
                HttpStatus.BAD_REQUEST, "koristi rank, ne rating");
        verify(gameAccountRepository, never()).save(any());
    }

    @Test
    void numericGameAcceptsRating() {
        creating(cs2);
        savingReturnsAccount();

        GameAccountResponse response = gameAccountService.create("igrac", request(cs2, null, null, null, 2100));

        assertThat(response.rating()).isEqualTo(2100);
        assertThat(response.rank()).isNull();
    }

    @Test
    void numericGameRejectsRank() {
        creating(cs2);

        assertStatus(() -> gameAccountService.create("igrac", request(cs2, null, null, 7L, null)),
                HttpStatus.BAD_REQUEST, "koristi rating, ne rank");
        verify(gameRankRepository, never()).findByIdAndGame_Id(anyLong(), anyLong());
    }

    @Test
    void gameWithoutRankRejectsRank() {
        creating(chess);

        assertStatus(() -> gameAccountService.create("igrac", request(chess, null, null, 7L, null)),
                HttpStatus.BAD_REQUEST, "nema rank");
    }

    @Test
    void gameWithoutRankRejectsRating() {
        creating(chess);

        assertStatus(() -> gameAccountService.create("igrac", request(chess, null, null, null, 1200)),
                HttpStatus.BAD_REQUEST, "nema rank");
    }

    @Test
    void gameWithoutRankAcceptsAccountWithNeither() {
        creating(chess);
        savingReturnsAccount();

        GameAccountResponse response = gameAccountService.create("igrac", request(chess, null, null, null, null));

        assertThat(response.rank()).isNull();
        assertThat(response.rating()).isNull();
    }

    @Test
    void regionFromAnotherGameIsRejected() {
        creating(lol);
        when(gameRegionRepository.findByIdAndGame_Id(20L, lol.getId())).thenReturn(Optional.empty());

        assertStatus(() -> gameAccountService.create("igrac", request(lol, 20L, null, null, null)),
                HttpStatus.BAD_REQUEST, "regija ne pripada igri");
    }

    @Test
    void positionFromAnotherGameIsRejected() {
        creating(lol);
        when(gamePositionRepository.findByIdAndGame_Id(12L, lol.getId())).thenReturn(Optional.empty());

        assertStatus(() -> gameAccountService.create("igrac", request(lol, null, 12L, null, null)),
                HttpStatus.BAD_REQUEST, "pozicija ne pripada igri");
    }

    @Test
    void rankFromAnotherGameIsRejected() {
        creating(lol);
        when(gameRankRepository.findByIdAndGame_Id(15L, lol.getId())).thenReturn(Optional.empty());

        assertStatus(() -> gameAccountService.create("igrac", request(lol, null, null, 15L, null)),
                HttpStatus.BAD_REQUEST, "rank ne pripada igri");
    }

    @Test
    void regionAndPositionOfSameGameAreStoredAsLabels() {
        creating(lol);
        savingReturnsAccount();
        when(gameRegionRepository.findByIdAndGame_Id(1L, lol.getId())).thenReturn(Optional.of(TestData.region(1L, lol, "EUW")));
        when(gamePositionRepository.findByIdAndGame_Id(3L, lol.getId())).thenReturn(Optional.of(TestData.position(3L, lol, "MID")));

        GameAccountResponse response = gameAccountService.create("igrac", request(lol, 1L, 3L, null, null));

        assertThat(response.region()).isEqualTo("EUW");
        assertThat(response.position()).isEqualTo("MID");
    }

    @Test
    void secondAccountForSameGameIsConflict() {
        when(userRepository.findByUsername("igrac")).thenReturn(Optional.of(player));
        when(gameRepository.findById(lol.getId())).thenReturn(Optional.of(lol));
        when(gameAccountRepository.existsByUser_UsernameAndGame_Id("igrac", lol.getId())).thenReturn(true);

        assertStatus(() -> gameAccountService.create("igrac", request(lol, null, null, null, null)), HttpStatus.CONFLICT);
        verify(gameAccountRepository, never()).save(any());
    }

    @Test
    void updateAppliesSameRulesAndSwitchesTierAccountToNewRank() {
        GameAccount account = GameAccount.builder()
                .id(5L)
                .user(player)
                .game(lol)
                .inGameName("Staro")
                .rank(TestData.rank(3L, lol, "SILVER"))
                .marketStatus(MarketStatus.INACTIVE)
                .build();
        when(gameAccountRepository.findByIdAndUser_Username(5L, "igrac")).thenReturn(Optional.of(account));

        assertStatus(() -> gameAccountService.update("igrac", 5L,
                new UpdateGameAccountRequest("Novo", null, null, null, 1800, MarketStatus.AVAILABLE)), HttpStatus.BAD_REQUEST);
        assertThat(account.getInGameName()).isEqualTo("Staro");

        savingReturnsAccount();
        when(gameRankRepository.findByIdAndGame_Id(7L, lol.getId())).thenReturn(Optional.of(TestData.rank(7L, lol, "DIAMOND")));

        GameAccountResponse response = gameAccountService.update("igrac", 5L,
                new UpdateGameAccountRequest(" Novo ", null, null, 7L, null, MarketStatus.AVAILABLE));

        assertThat(response.rank()).isEqualTo("DIAMOND");
        assertThat(response.inGameName()).isEqualTo("Novo");
        assertThat(response.marketStatus()).isEqualTo("AVAILABLE");
    }

    private void creating(Game game) {
        when(userRepository.findByUsername("igrac")).thenReturn(Optional.of(player));
        when(gameRepository.findById(game.getId())).thenReturn(Optional.of(game));
        when(gameAccountRepository.existsByUser_UsernameAndGame_Id("igrac", game.getId())).thenReturn(false);
    }

    private void savingReturnsAccount() {
        when(gameAccountRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private static CreateGameAccountRequest request(Game game, Long regionId, Long positionId, Long rankId, Integer rating) {
        return new CreateGameAccountRequest(game.getId(), "Igrac#1", regionId, positionId, rankId, rating);
    }
}
