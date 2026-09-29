package com.esportshub.backend.tournament;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.game.GameRepository;
import com.esportshub.backend.support.TestData;
import com.esportshub.backend.team.Team;
import com.esportshub.backend.team.TeamRepository;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Optional;

import static com.esportshub.backend.support.ApiAssertions.assertStatus;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TournamentRegistrationTest {

    @Mock
    private TournamentRepository tournamentRepository;
    @Mock
    private GameRepository gameRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TournamentRegistrationRepository tournamentRegistrationRepository;
    @Mock
    private TeamRepository teamRepository;

    @InjectMocks
    private TournamentService tournamentService;

    private Game lol;
    private Tournament tournament;
    private Team team;

    @BeforeEach
    void setUp() {
        lol = TestData.game(1L, "LOL", "TIER");
        tournament = Tournament.builder()
                .id(10L)
                .name("Kup")
                .game(lol)
                .format("SINGLE_ELIMINATION")
                .maxTeams(4)
                .status(TournamentStatus.REGISTRATION)
                .organizer(TestData.user(1L, "org"))
                .build();
        team = TestData.team(7L, "Alfa", lol, TestData.user(2L, "cap"));
    }

    @Test
    void registrationIsClosedOutsideRegistrationPhase() {
        tournament.setStatus(TournamentStatus.PENDING);
        when(tournamentRepository.findById(tournament.getId())).thenReturn(Optional.of(tournament));

        assertStatus(() -> register("cap"), HttpStatus.CONFLICT, "prijave nisu otvorene");
    }

    @Test
    void teamOfAnotherGameIsBadRequest() {
        Team csTeam = TestData.team(8L, "CS", TestData.game(2L, "CS2", "NUMERIC"), team.getCaptain());
        when(tournamentRepository.findById(tournament.getId())).thenReturn(Optional.of(tournament));
        when(teamRepository.findById(csTeam.getId())).thenReturn(Optional.of(csTeam));

        assertStatus(() -> tournamentService.register("cap", tournament.getId(), new RegisterTeamRequest(csTeam.getId())),
                HttpStatus.BAD_REQUEST, "nisu ista igra");
    }

    @Test
    void onlyCaptainCanRegisterTeam() {
        teamIsKnown();

        assertStatus(() -> register("neko"), HttpStatus.FORBIDDEN, "nisi kapiten");
    }

    @Test
    void alreadyRegisteredTeamIsConflict() {
        teamIsKnown();
        when(tournamentRegistrationRepository.existsByTournament_IdAndTeam_IdAndStatus(
                tournament.getId(), team.getId(), RegistrationStatus.REGISTERED)).thenReturn(true);

        assertStatus(() -> register("cap"), HttpStatus.CONFLICT, "vec prijavljen");
    }

    @Test
    void fullTournamentIsConflict() {
        teamIsKnown();
        when(tournamentRegistrationRepository.countByTournament_IdAndStatus(tournament.getId(), RegistrationStatus.REGISTERED))
                .thenReturn(4L);

        assertStatus(() -> register("cap"), HttpStatus.CONFLICT, "turnir je pun");
        verify(tournamentRegistrationRepository, never()).save(any());
    }

    @Test
    void tournamentWithoutLimitNeverFillsUp() {
        tournament.setMaxTeams(null);
        teamIsKnown();
        savingReturnsRegistration();
        when(tournamentRegistrationRepository.findByTournament_IdAndTeam_Id(tournament.getId(), team.getId()))
                .thenReturn(Optional.empty());

        assertThat(register("cap").status()).isEqualTo("REGISTERED");
        verify(tournamentRegistrationRepository, never()).countByTournament_IdAndStatus(any(), any());
    }

    @Test
    void firstRegistrationCreatesNewRow() {
        teamIsKnown();
        savingReturnsRegistration();
        when(tournamentRegistrationRepository.findByTournament_IdAndTeam_Id(tournament.getId(), team.getId()))
                .thenReturn(Optional.empty());

        RegistrationResponse response = register("cap");

        assertThat(response.id()).isNull();
        assertThat(response.status()).isEqualTo("REGISTERED");
        assertThat(response.teamId()).isEqualTo(team.getId());
    }

    @Test
    void reRegisteringAfterWithdrawalReactivatesSameRow() {
        TournamentRegistration withdrawn = TournamentRegistration.builder()
                .id(33L)
                .tournament(tournament)
                .team(team)
                .status(RegistrationStatus.WITHDRAWN)
                .registeredAt(Instant.parse("2026-01-01T10:00:00Z"))
                .build();
        teamIsKnown();
        savingReturnsRegistration();
        when(tournamentRegistrationRepository.findByTournament_IdAndTeam_Id(tournament.getId(), team.getId()))
                .thenReturn(Optional.of(withdrawn));

        RegistrationResponse response = register("cap");

        ArgumentCaptor<TournamentRegistration> saved = ArgumentCaptor.forClass(TournamentRegistration.class);
        verify(tournamentRegistrationRepository).save(saved.capture());
        assertThat(saved.getValue()).isSameAs(withdrawn);
        assertThat(response.id()).isEqualTo(33L);
        assertThat(withdrawn.getStatus()).isEqualTo(RegistrationStatus.REGISTERED);
        assertThat(withdrawn.getRegisteredAt()).isAfter(Instant.parse("2026-01-01T10:00:00Z"));
    }

    private RegistrationResponse register(String username) {
        return tournamentService.register(username, tournament.getId(), new RegisterTeamRequest(team.getId()));
    }

    private void teamIsKnown() {
        when(tournamentRepository.findById(tournament.getId())).thenReturn(Optional.of(tournament));
        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
    }

    private void savingReturnsRegistration() {
        when(tournamentRegistrationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }
}
