package com.esportshub.backend.bracket;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.support.TestData;
import com.esportshub.backend.tournament.RegistrationStatus;
import com.esportshub.backend.tournament.Tournament;
import com.esportshub.backend.tournament.TournamentRegistration;
import com.esportshub.backend.tournament.TournamentRegistrationRepository;
import com.esportshub.backend.tournament.TournamentRepository;
import com.esportshub.backend.tournament.TournamentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.IntStream;

import static com.esportshub.backend.support.ApiAssertions.assertStatus;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BracketServiceTest {

    @Mock
    private TournamentRepository tournamentRepository;
    @Mock
    private TournamentRegistrationRepository tournamentRegistrationRepository;
    @Mock
    private RoundRepository roundRepository;
    @Mock
    private MatchRepository matchRepository;

    private BracketService bracketService;
    private Tournament tournament;
    private Game lol;

    @BeforeEach
    void setUp() {
        BracketStrategyResolver resolver = new BracketStrategyResolver(List.of(new SingleEliminationStrategy()));
        bracketService = new BracketService(tournamentRepository, tournamentRegistrationRepository,
                roundRepository, matchRepository, resolver);
        lol = TestData.game(1L, "LOL", "TIER");
        tournament = Tournament.builder()
                .id(10L)
                .name("Kup")
                .game(lol)
                .format("SINGLE_ELIMINATION")
                .status(TournamentStatus.REGISTRATION)
                .organizer(TestData.user(1L, "org"))
                .build();
        when(tournamentRepository.findById(tournament.getId())).thenReturn(Optional.of(tournament));
    }

    @Test
    void userWhoIsNeitherOrganizerNorAdminIsForbidden() {
        assertStatus(() -> bracketService.generate("neko", false, tournament.getId()), HttpStatus.FORBIDDEN);
        verify(matchRepository, never()).saveAll(anyList());
    }

    @ParameterizedTest
    @EnumSource(value = TournamentStatus.class, names = "REGISTRATION", mode = EnumSource.Mode.EXCLUDE)
    void tournamentOutsideRegistrationPhaseIsConflict(TournamentStatus status) {
        tournament.setStatus(status);

        assertStatus(() -> bracketService.generate("org", false, tournament.getId()), HttpStatus.CONFLICT, "nije u fazi prijava");
    }

    @Test
    void secondGenerationIsConflict() {
        when(matchRepository.existsByTournament_Id(tournament.getId())).thenReturn(true);

        assertStatus(() -> bracketService.generate("org", false, tournament.getId()), HttpStatus.CONFLICT, "bracket vec postoji");
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1})
    void fewerThanTwoTeamsIsBadRequest(int teams) {
        registered(teams);

        assertStatus(() -> bracketService.generate("org", false, tournament.getId()), HttpStatus.BAD_REQUEST, "premalo timova");
    }

    @ParameterizedTest
    @ValueSource(ints = {3, 5, 6, 7, 12})
    void teamCountThatIsNotPowerOfTwoIsBadRequest(int teams) {
        registered(teams);

        assertStatus(() -> bracketService.generate("org", false, tournament.getId()), HttpStatus.BAD_REQUEST, "stepen dvojke");
        assertThat(tournament.getStatus()).isEqualTo(TournamentStatus.REGISTRATION);
    }

    @Test
    void unsupportedFormatIsBadRequest() {
        tournament.setFormat("ROUND_ROBIN");
        registered(4);

        assertStatus(() -> bracketService.generate("org", false, tournament.getId()), HttpStatus.BAD_REQUEST, "nepodrzan format");
    }

    @Test
    void adminGeneratesBracketSeedsTeamsAndStartsTournament() {
        List<TournamentRegistration> registrations = registered(4);
        when(roundRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        AtomicLong ids = new AtomicLong(100);
        when(matchRepository.saveAll(anyList())).thenAnswer(invocation -> {
            List<Match> matches = invocation.getArgument(0);
            matches.stream().filter(match -> match.getId() == null).forEach(match -> match.setId(ids.incrementAndGet()));
            return matches;
        });

        bracketService.generate("admin", true, tournament.getId());

        assertThat(tournament.getStatus()).isEqualTo(TournamentStatus.ONGOING);
        assertThat(registrations).extracting(TournamentRegistration::getSeed).containsExactly(1, 2, 3, 4);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Match>> saved = ArgumentCaptor.forClass(List.class);
        verify(matchRepository, times(2)).saveAll(saved.capture());
        List<Match> matches = saved.getAllValues().get(1);
        assertThat(matches).hasSize(3);
        assertThat(matches).allSatisfy(match -> {
            assertThat(match.getStatus()).isEqualTo(MatchStatus.SCHEDULED);
            assertThat(match.getSpectatorKey()).isNotBlank();
        });
        assertThat(matches).extracting(Match::getSpectatorKey).doesNotHaveDuplicates();
        assertThat(matches.get(0).getNextMatchId()).isEqualTo(matches.get(2).getId());
        assertThat(matches.get(1).getNextMatchId()).isEqualTo(matches.get(2).getId());
        assertThat(matches.get(2).getNextMatchId()).isNull();
        verify(tournamentRegistrationRepository).saveAll(any());
    }

    private List<TournamentRegistration> registered(int count) {
        List<TournamentRegistration> registrations = IntStream.rangeClosed(1, count)
                .mapToObj(i -> TournamentRegistration.builder()
                        .id((long) i)
                        .tournament(tournament)
                        .team(TestData.team((long) i, "Tim " + i, lol, TestData.user((long) i + 10, "cap" + i)))
                        .status(RegistrationStatus.REGISTERED)
                        .build())
                .toList();
        when(tournamentRegistrationRepository.findByTournament_IdAndStatusOrderByRegisteredAtAsc(
                tournament.getId(), RegistrationStatus.REGISTERED)).thenReturn(registrations);
        return registrations;
    }
}
