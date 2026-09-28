package com.esportshub.backend.bracket;

import com.esportshub.backend.team.Team;
import com.esportshub.backend.tournament.RegistrationStatus;
import com.esportshub.backend.tournament.Tournament;
import com.esportshub.backend.tournament.TournamentRegistration;
import com.esportshub.backend.tournament.TournamentRegistrationRepository;
import com.esportshub.backend.tournament.TournamentRepository;
import com.esportshub.backend.tournament.TournamentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BracketService {

    private final TournamentRepository tournamentRepository;
    private final TournamentRegistrationRepository tournamentRegistrationRepository;
    private final RoundRepository roundRepository;
    private final MatchRepository matchRepository;
    private final BracketStrategyResolver bracketStrategyResolver;

    public BracketResponse generate(String username, boolean isAdmin, Long tournamentId) {
        Tournament tournament = tournamentRepository.findById(tournamentId).orElseThrow(BracketService::tournamentNotFound);

        if (!tournament.getOrganizer().getUsername().equals(username) && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "samo organizator ili admin");
        }

        if (tournament.getStatus() != TournamentStatus.REGISTRATION) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "turnir nije u fazi prijava");
        }

        if (matchRepository.existsByTournament_Id(tournamentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "bracket vec postoji");
        }

        List<TournamentRegistration> registrations = tournamentRegistrationRepository
                .findByTournament_IdAndStatusOrderByRegisteredAtAsc(tournamentId, RegistrationStatus.REGISTERED);
        int n = registrations.size();

        if (n < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "premalo timova");
        }

        if (Integer.bitCount(n) != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "broj timova mora biti stepen dvojke (2,4,8,16...)");
        }

        BracketStrategy strategy = bracketStrategyResolver.resolve(tournament.getFormat());

        List<Team> teams = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            TournamentRegistration registration = registrations.get(i);
            registration.setSeed(i + 1);
            teams.add(registration.getTeam());
        }
        tournamentRegistrationRepository.saveAll(registrations);

        BracketBuilder builder = new BracketBuilder();
        strategy.generate(builder, teams);

        List<Round> rounds = roundRepository.saveAll(builder.rounds().stream()
                .map(spec -> Round.builder()
                        .tournament(tournament)
                        .roundNumber(spec.roundNumber())
                        .name(spec.name())
                        .build())
                .toList());

        List<Match> matches = matchRepository.saveAll(builder.matches().stream()
                .map(spec -> Match.builder()
                        .tournament(tournament)
                        .round(rounds.get(spec.round().index()))
                        .teamA(spec.teamA())
                        .teamB(spec.teamB())
                        .status(MatchStatus.SCHEDULED)
                        .spectatorKey(UUID.randomUUID().toString())
                        .build())
                .toList());

        for (BracketBuilder.Link link : builder.links()) {
            Match from = matches.get(link.from().index());
            from.setNextMatchId(matches.get(link.to().index()).getId());
        }
        matchRepository.saveAll(matches);

        tournament.setStatus(TournamentStatus.ONGOING);
        tournamentRepository.save(tournament);

        return toResponse(tournament);
    }

    private BracketResponse toResponse(Tournament tournament) {
        Map<Long, List<MatchView>> matchesByRound = matchRepository
                .findByTournament_IdOrderByRound_RoundNumberAscIdAsc(tournament.getId()).stream()
                .filter(match -> match.getRound() != null)
                .collect(Collectors.groupingBy(match -> match.getRound().getId(),
                        Collectors.mapping(MatchView::from, Collectors.toList())));

        List<RoundView> rounds = roundRepository.findByTournament_IdOrderByRoundNumber(tournament.getId()).stream()
                .map(round -> new RoundView(
                        round.getRoundNumber(),
                        round.getName(),
                        matchesByRound.getOrDefault(round.getId(), List.of())))
                .toList();

        return new BracketResponse(tournament.getId(), tournament.getName(), tournament.getStatus().name(), rounds);
    }

    private static ResponseStatusException tournamentNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Turnir ne postoji");
    }
}
