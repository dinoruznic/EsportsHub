package com.esportshub.backend.tournament;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.game.GameRepository;
import com.esportshub.backend.team.Team;
import com.esportshub.backend.team.TeamRepository;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class TournamentService {

    private static final Set<TournamentStatus> PUBLIC_STATUSES = Set.of(
            TournamentStatus.REGISTRATION,
            TournamentStatus.ONGOING,
            TournamentStatus.COMPLETED);

    private final TournamentRepository tournamentRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final TournamentRegistrationRepository tournamentRegistrationRepository;
    private final TeamRepository teamRepository;

    public TournamentResponse create(String username, CreateTournamentRequest request) {
        User organizer = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Korisnik nije prijavljen"));

        Game game = gameRepository.findById(request.gameId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown game"));

        Tournament tournament = Tournament.builder()
                .name(request.name().trim())
                .game(game)
                .format(request.format().trim())
                .maxTeams(request.maxTeams())
                .status(TournamentStatus.PENDING)
                .prizePool(request.prizePool())
                .startDate(request.startDate())
                .organizer(organizer)
                .build();

        return TournamentResponse.from(tournamentRepository.save(tournament));
    }

    @Transactional(readOnly = true)
    public List<TournamentResponse> listPublic() {
        return tournamentRepository.findByStatusIn(PUBLIC_STATUSES).stream()
                .map(TournamentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TournamentResponse getOne(Long id, Authentication authentication) {
        Tournament tournament = tournamentRepository.findById(id).orElseThrow(TournamentService::notFound);

        if (!PUBLIC_STATUSES.contains(tournament.getStatus()) && !canSeeHidden(tournament, authentication)) {
            throw notFound();
        }

        return TournamentResponse.from(tournament);
    }

    @Transactional(readOnly = true)
    public List<TournamentResponse> listPending() {
        return tournamentRepository.findByStatus(TournamentStatus.PENDING).stream()
                .map(TournamentResponse::from)
                .toList();
    }

    public TournamentResponse approve(Long id) {
        return changeStatus(id, TournamentStatus.REGISTRATION);
    }

    public TournamentResponse reject(Long id) {
        return changeStatus(id, TournamentStatus.REJECTED);
    }

    private TournamentResponse changeStatus(Long id, TournamentStatus target) {
        Tournament tournament = tournamentRepository.findById(id).orElseThrow(TournamentService::notFound);

        if (tournament.getStatus() != TournamentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Turnir nije u statusu PENDING");
        }

        tournament.setStatus(target);
        return TournamentResponse.from(tournamentRepository.save(tournament));
    }

    public RegistrationResponse register(String username, Long tournamentId, RegisterTeamRequest request) {
        Tournament tournament = tournamentRepository.findById(tournamentId).orElseThrow(TournamentService::notFound);

        if (tournament.getStatus() != TournamentStatus.REGISTRATION) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "prijave nisu otvorene");
        }

        Team team = teamRepository.findById(request.teamId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "tim ne postoji"));

        if (!team.getCaptain().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "nisi kapiten tima");
        }

        if (!team.getGame().getId().equals(tournament.getGame().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tim i turnir nisu ista igra");
        }

        if (tournamentRegistrationRepository.existsByTournament_IdAndTeam_IdAndStatus(tournamentId, team.getId(), RegistrationStatus.REGISTERED)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "tim je vec prijavljen");
        }

        if (tournament.getMaxTeams() != null
                && tournamentRegistrationRepository.countByTournament_IdAndStatus(tournamentId, RegistrationStatus.REGISTERED) >= tournament.getMaxTeams()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "turnir je pun");
        }

        TournamentRegistration registration = tournamentRegistrationRepository
                .findByTournament_IdAndTeam_Id(tournamentId, team.getId())
                .orElseGet(() -> TournamentRegistration.builder()
                        .tournament(tournament)
                        .team(team)
                        .build());

        registration.setStatus(RegistrationStatus.REGISTERED);
        registration.setRegisteredAt(Instant.now());

        return RegistrationResponse.from(tournamentRegistrationRepository.save(registration));
    }

    @Transactional(readOnly = true)
    public List<RegistrationResponse> listRegistrations(Long tournamentId) {
        tournamentRepository.findById(tournamentId).orElseThrow(TournamentService::notFound);

        return tournamentRegistrationRepository.findByTournament_Id(tournamentId).stream()
                .map(RegistrationResponse::from)
                .toList();
    }

    public void withdraw(String username, Long tournamentId, Long registrationId) {
        TournamentRegistration registration = tournamentRegistrationRepository.findById(registrationId)
                .orElseThrow(TournamentService::registrationNotFound);

        if (!registration.getTournament().getId().equals(tournamentId)) {
            throw registrationNotFound();
        }

        if (!registration.getTeam().getCaptain().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "nisi kapiten tima");
        }

        if (registration.getTournament().getStatus() != TournamentStatus.REGISTRATION) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ne mozes se povuci nakon zdrijeba");
        }

        registration.setStatus(RegistrationStatus.WITHDRAWN);
        tournamentRegistrationRepository.save(registration);
    }

    private boolean canSeeHidden(Tournament tournament, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        boolean isOrganizer = tournament.getOrganizer().getUsername().equals(authentication.getName());
        boolean isAdmin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);

        return isOrganizer || isAdmin;
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Turnir ne postoji");
    }

    private static ResponseStatusException registrationNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "prijava ne postoji");
    }
}
