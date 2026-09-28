package com.esportshub.backend.match;

import com.esportshub.backend.bracket.Match;
import com.esportshub.backend.bracket.MatchRepository;
import com.esportshub.backend.bracket.MatchStatus;
import com.esportshub.backend.bracket.MatchView;
import com.esportshub.backend.game.Game;
import com.esportshub.backend.support.TestData;
import com.esportshub.backend.team.Team;
import com.esportshub.backend.tournament.Tournament;
import com.esportshub.backend.tournament.TournamentRepository;
import com.esportshub.backend.tournament.TournamentStatus;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static com.esportshub.backend.support.ApiAssertions.assertStatus;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchServiceTest {

    private static final MatchActor REFEREE = new MatchActor("ref", false);
    private static final MatchActor ORGANIZER = new MatchActor("org", false);
    private static final MatchActor ADMIN = new MatchActor("admin", true);
    private static final MatchActor STRANGER = new MatchActor("random", false);

    @Mock
    private MatchRepository matchRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TournamentRepository tournamentRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private MatchService matchService;

    private Tournament tournament;
    private Team teamA;
    private Team teamB;
    private User referee;

    @BeforeEach
    void setUp() {
        Game game = TestData.game(1L, "LOL", "TIER");
        User organizer = TestData.user(1L, "org");
        referee = TestData.user(2L, "ref", "REFEREE");
        tournament = Tournament.builder()
                .id(10L)
                .name("Kup")
                .game(game)
                .format("SINGLE_ELIMINATION")
                .status(TournamentStatus.ONGOING)
                .organizer(organizer)
                .build();
        teamA = TestData.team(100L, "Alfa", game, TestData.user(3L, "capA"));
        teamB = TestData.team(200L, "Beta", game, TestData.user(4L, "capB"));
    }

    @Test
    void startRequiresBothTeams() {
        Match match = stored(match(1L, MatchStatus.SCHEDULED, teamA, null, null));

        assertStatus(() -> matchService.start(REFEREE, match.getId()), HttpStatus.CONFLICT, "nema oba tima");
        assertThat(match.getStatus()).isEqualTo(MatchStatus.SCHEDULED);
    }

    @Test
    void startMovesScheduledMatchToLive() {
        Match match = stored(match(1L, MatchStatus.SCHEDULED, teamA, teamB, null));

        MatchView view = matchService.start(REFEREE, match.getId());

        assertThat(view.status()).isEqualTo("LIVE");
        assertThat(match.getStartedAt()).isNotNull();
        verify(matchRepository).save(match);
    }

    @Test
    void startingLiveMatchAgainIsForbiddenTransition() {
        Match match = stored(match(1L, MatchStatus.LIVE, teamA, teamB, null));

        assertStatus(() -> matchService.start(REFEREE, match.getId()), HttpStatus.CONFLICT, "nedozvoljen prelaz: LIVE -> LIVE");
    }

    @Test
    void updateScoreIsRejectedUnlessMatchIsLive() {
        Match match = stored(match(1L, MatchStatus.SCHEDULED, teamA, teamB, null));

        assertStatus(() -> matchService.updateScore(REFEREE, match.getId(), new ScoreRequest(1, 0)),
                HttpStatus.CONFLICT, "nije uzivo");
        verify(matchRepository, never()).save(any());
    }

    @Test
    void updateScoreStoresScoresOfLiveMatch() {
        Match match = stored(match(1L, MatchStatus.LIVE, teamA, teamB, null));

        MatchView view = matchService.updateScore(REFEREE, match.getId(), new ScoreRequest(2, 1));

        assertThat(view.scoreA()).isEqualTo(2);
        assertThat(view.scoreB()).isEqualTo(1);
    }

    @Test
    void finishWithTieIsBadRequest() {
        Match match = stored(match(1L, MatchStatus.LIVE, teamA, teamB, null));

        assertStatus(() -> matchService.finish(REFEREE, match.getId(), new ScoreRequest(1, 1)),
                HttpStatus.BAD_REQUEST, "nerijeseno");
        assertThat(match.getStatus()).isEqualTo(MatchStatus.LIVE);
    }

    @Test
    void finishBeforeStartIsForbiddenTransition() {
        Match match = stored(match(1L, MatchStatus.SCHEDULED, teamA, teamB, null));

        assertStatus(() -> matchService.finish(REFEREE, match.getId(), new ScoreRequest(2, 0)),
                HttpStatus.CONFLICT, "nedozvoljen prelaz: SCHEDULED -> FINISHED");
    }

    @Test
    void finishSetsWinnerByHigherScore() {
        Match match = stored(match(1L, MatchStatus.LIVE, teamA, teamB, null));

        MatchView view = matchService.finish(REFEREE, match.getId(), new ScoreRequest(0, 2));

        assertThat(view.status()).isEqualTo("FINISHED");
        assertThat(view.winnerTeamId()).isEqualTo(teamB.getId());
        assertThat(match.getEndedAt()).isNotNull();
    }

    @Test
    void finishingSemifinalPutsWinnerIntoFinalSlotA() {
        Match semifinal1 = stored(match(1L, MatchStatus.LIVE, teamA, teamB, 3L));
        Match semifinal2 = match(2L, MatchStatus.SCHEDULED, null, null, 3L);
        Match finalMatch = stored(match(3L, MatchStatus.SCHEDULED, null, null, null));
        when(matchRepository.findByNextMatchIdOrderByIdAsc(3L)).thenReturn(List.of(semifinal1, semifinal2));

        matchService.finish(REFEREE, semifinal1.getId(), new ScoreRequest(2, 1));

        assertThat(finalMatch.getTeamA()).isEqualTo(teamA);
        assertThat(finalMatch.getTeamB()).isNull();
        verify(matchRepository).save(finalMatch);
        verify(tournamentRepository, never()).save(any());
    }

    @Test
    void finishingSecondSemifinalPutsWinnerIntoFinalSlotB() {
        Match semifinal1 = match(1L, MatchStatus.FINISHED, null, null, 3L);
        Match semifinal2 = stored(match(2L, MatchStatus.LIVE, teamA, teamB, 3L));
        Match finalMatch = stored(match(3L, MatchStatus.SCHEDULED, null, null, null));
        when(matchRepository.findByNextMatchIdOrderByIdAsc(3L)).thenReturn(List.of(semifinal1, semifinal2));

        matchService.finish(REFEREE, semifinal2.getId(), new ScoreRequest(0, 3));

        assertThat(finalMatch.getTeamA()).isNull();
        assertThat(finalMatch.getTeamB()).isEqualTo(teamB);
    }

    @Test
    void finishingFinalCompletesTournament() {
        Match finalMatch = stored(match(3L, MatchStatus.LIVE, teamA, teamB, null));

        matchService.finish(REFEREE, finalMatch.getId(), new ScoreRequest(3, 1));

        assertThat(tournament.getStatus()).isEqualTo(TournamentStatus.COMPLETED);
        verify(tournamentRepository).save(tournament);
        verify(matchRepository, never()).findByNextMatchIdOrderByIdAsc(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ref", "org", "admin"})
    void refereeOrganizerAndAdminMayControlMatch(String who) {
        MatchActor actor = switch (who) {
            case "ref" -> REFEREE;
            case "org" -> ORGANIZER;
            default -> ADMIN;
        };
        Match match = stored(match(1L, MatchStatus.SCHEDULED, teamA, teamB, null));

        assertThat(matchService.start(actor, match.getId()).status()).isEqualTo("LIVE");
    }

    @Test
    void randomUserCannotControlMatch() {
        Match match = stored(match(1L, MatchStatus.LIVE, teamA, teamB, null));

        assertStatus(() -> matchService.start(STRANGER, match.getId()), HttpStatus.FORBIDDEN);
        assertStatus(() -> matchService.updateScore(STRANGER, match.getId(), new ScoreRequest(1, 0)), HttpStatus.FORBIDDEN);
        assertStatus(() -> matchService.finish(STRANGER, match.getId(), new ScoreRequest(1, 0)), HttpStatus.FORBIDDEN);
        assertStatus(() -> matchService.agentKey(STRANGER, match.getId()), HttpStatus.FORBIDDEN);
    }

    @Test
    void assignRefereeRequiresRefereeRole() {
        Match match = stored(match(1L, MatchStatus.SCHEDULED, teamA, teamB, null));
        match.setReferee(null);
        when(userRepository.findByUsername("igrac")).thenReturn(Optional.of(TestData.user(9L, "igrac", "PLAYER")));

        assertStatus(() -> matchService.assignReferee(ORGANIZER, match.getId(), new AssignRefereeRequest("igrac")),
                HttpStatus.BAD_REQUEST, "nije sudija");
        assertThat(match.getReferee()).isNull();
    }

    @Test
    void assignRefereeSetsUserWithRefereeRole() {
        Match match = stored(match(1L, MatchStatus.SCHEDULED, teamA, teamB, null));
        match.setReferee(null);
        when(userRepository.findByUsername("ref")).thenReturn(Optional.of(referee));

        matchService.assignReferee(ADMIN, match.getId(), new AssignRefereeRequest(" ref "));

        assertThat(match.getReferee()).isEqualTo(referee);
    }

    @Test
    void refereeCannotAssignReferees() {
        Match match = stored(match(1L, MatchStatus.SCHEDULED, teamA, teamB, null));

        assertStatus(() -> matchService.assignReferee(REFEREE, match.getId(), new AssignRefereeRequest("ref")),
                HttpStatus.FORBIDDEN);
    }

    @Test
    void startPublishesStartedEventWithActor() {
        Match match = stored(match(1L, MatchStatus.SCHEDULED, teamA, teamB, null));

        matchService.start(REFEREE, match.getId());

        List<MatchEvent> events = publishedEvents(1);
        assertThat(events.get(0).type()).isEqualTo(MatchEvent.STARTED);
        assertThat(events.get(0).actor()).isEqualTo("ref");
        assertThat(events.get(0).tournamentId()).isEqualTo(tournament.getId());
    }

    @Test
    void finishingSemifinalPublishesFinishedThenWinnerAdvanced() {
        Match semifinal1 = stored(match(1L, MatchStatus.LIVE, teamA, teamB, 3L));
        stored(match(3L, MatchStatus.SCHEDULED, null, null, null));
        when(matchRepository.findByNextMatchIdOrderByIdAsc(3L)).thenReturn(List.of(semifinal1));

        matchService.finish(ORGANIZER, semifinal1.getId(), new ScoreRequest(2, 0));

        List<MatchEvent> events = publishedEvents(2);
        assertThat(events).extracting(MatchEvent::type).containsExactly(MatchEvent.FINISHED, MatchEvent.WINNER_ADVANCED);
        assertThat(events.get(0).data()).containsEntry("winnerTeamId", teamA.getId()).containsEntry("nextMatchId", 3L);
        assertThat(events.get(1).data()).containsEntry("slot", "A");
    }

    @Test
    void finishingFinalPublishesFinishedThenTournamentCompleted() {
        Match finalMatch = stored(match(3L, MatchStatus.LIVE, teamA, teamB, null));

        matchService.finish(ADMIN, finalMatch.getId(), new ScoreRequest(1, 2));

        List<MatchEvent> events = publishedEvents(2);
        assertThat(events).extracting(MatchEvent::type)
                .containsExactly(MatchEvent.FINISHED, MatchEvent.TOURNAMENT_COMPLETED);
        assertThat(events.get(1).data()).containsEntry("winnerTeamId", teamB.getId());
        assertThat(events).extracting(MatchEvent::actor).containsOnly("admin");
    }

    @Test
    void rejectedActionPublishesNothing() {
        Match match = stored(match(1L, MatchStatus.LIVE, teamA, teamB, null));

        assertStatus(() -> matchService.finish(REFEREE, match.getId(), new ScoreRequest(1, 1)), HttpStatus.BAD_REQUEST);

        verify(eventPublisher, never()).publishEvent(any(Object.class));
    }

    private Match match(Long id, MatchStatus status, Team a, Team b, Long nextMatchId) {
        return Match.builder()
                .id(id)
                .tournament(tournament)
                .teamA(a)
                .teamB(b)
                .referee(referee)
                .status(status)
                .scoreA(0)
                .scoreB(0)
                .nextMatchId(nextMatchId)
                .build();
    }

    private Match stored(Match match) {
        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        return match;
    }

    private List<MatchEvent> publishedEvents(int expected) {
        ArgumentCaptor<MatchEvent> captor = ArgumentCaptor.forClass(MatchEvent.class);
        verify(eventPublisher, times(expected)).publishEvent(captor.capture());
        return captor.getAllValues();
    }
}
