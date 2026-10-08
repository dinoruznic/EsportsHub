package com.esportshub.backend.match;

import com.esportshub.backend.bracket.Match;
import com.esportshub.backend.bracket.MatchRepository;
import com.esportshub.backend.bracket.MatchStatus;
import com.esportshub.backend.game.Game;
import com.esportshub.backend.support.TestData;
import com.esportshub.backend.team.Team;
import com.esportshub.backend.team.TeamMembershipRepository;
import com.esportshub.backend.tournament.Tournament;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RefereeAssignerTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private MatchRepository matchRepository;
    @Mock
    private TeamMembershipRepository teamMembershipRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private RefereeAssigner refereeAssigner;

    private Team teamA;
    private Team teamB;
    private Match match;

    @BeforeEach
    void setUp() {
        Game game = TestData.game(1L, "LOL", "TIER");
        Tournament tournament = Tournament.builder().id(10L).organizer(TestData.user(1L, "org")).build();
        teamA = TestData.team(100L, "Alfa", game, TestData.user(3L, "capA"));
        teamB = TestData.team(200L, "Beta", game, TestData.user(4L, "capB"));
        match = Match.builder().id(5L).tournament(tournament).teamA(teamA).teamB(teamB)
                .status(MatchStatus.SCHEDULED).build();
        when(teamMembershipRepository.existsByTeam_IdAndGameAccount_User_UsernameAndActiveTrue(anyLong(), anyString()))
                .thenReturn(false);
    }

    @Test
    void picksTheRefereeWithTheFewestOpenMatches() {
        User busy = referee(20L, "ana", 2);
        User free = referee(21L, "zoran", 0);
        referees(busy, free);

        assertThat(refereeAssigner.assignIfMissing(match)).contains(free);
        assertThat(match.getReferee()).isEqualTo(free);
        assertThat(match.isRefereeAuto()).isTrue();
        verify(matchRepository).save(match);
    }

    @Test
    void breaksTiesByUsername() {
        User mirza = referee(20L, "mirza", 1);
        User amra = referee(21L, "amra", 1);
        referees(mirza, amra);

        assertThat(refereeAssigner.assignIfMissing(match)).contains(amra);
    }

    @Test
    void skipsCaptainsAndMembersOfEitherTeam() {
        User captain = referee(20L, "capB", 0);
        teamB.setCaptain(captain);
        User member = referee(21L, "clan", 0);
        User fair = referee(22L, "posten", 3);
        when(teamMembershipRepository.existsByTeam_IdAndGameAccount_User_UsernameAndActiveTrue(teamA.getId(), "clan"))
                .thenReturn(true);
        referees(captain, member, fair);

        assertThat(refereeAssigner.conflictTeam(captain, match)).contains(teamB);
        assertThat(refereeAssigner.conflictTeam(member, match)).contains(teamA);
        assertThat(refereeAssigner.conflictTeam(fair, match)).isEmpty();
        assertThat(refereeAssigner.assignIfMissing(match)).contains(fair);
    }

    @Test
    void leavesTheMatchEmptyWhenNobodyIsEligible() {
        User captain = referee(20L, "capA", 0);
        teamA.setCaptain(captain);
        referees(captain);

        assertThat(refereeAssigner.assignIfMissing(match)).isEmpty();
        assertThat(match.getReferee()).isNull();
        verify(matchRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any(Object.class));
    }

    @Test
    void doesNothingForMatchesWithRefereeOrWithoutBothTeams() {
        match.setReferee(TestData.user(30L, "postoji", "REFEREE"));
        assertThat(refereeAssigner.assignIfMissing(match)).isEmpty();

        match.setReferee(null);
        match.setTeamB(null);
        assertThat(refereeAssigner.assignIfMissing(match)).isEmpty();
        verify(userRepository, never()).findByRoles_NameOrderByUsernameAsc(anyString());
    }

    @Test
    void publishesTheAssignmentAsTheSystem() {
        User free = referee(21L, "zoran", 0);
        referees(free);

        refereeAssigner.assignIfMissing(match);

        ArgumentCaptor<MatchEvent> event = ArgumentCaptor.forClass(MatchEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().type()).isEqualTo(MatchEvent.REFEREE_ASSIGNED);
        assertThat(event.getValue().actor()).isEqualTo(RefereeAssigner.SYSTEM_ACTOR);
        assertThat(event.getValue().matchId()).isEqualTo(5L);
        assertThat(event.getValue().tournamentId()).isEqualTo(10L);
        assertThat(event.getValue().data()).containsEntry("referee", "zoran").containsEntry("automatic", true);
    }

    private User referee(Long id, String username, long openMatches) {
        User user = TestData.user(id, username, "REFEREE");
        when(matchRepository.countByReferee_IdAndStatusIn(eq(id), anyCollection())).thenReturn(openMatches);
        return user;
    }

    private void referees(User... users) {
        when(userRepository.findByRoles_NameOrderByUsernameAsc("REFEREE")).thenReturn(List.of(users));
    }
}
