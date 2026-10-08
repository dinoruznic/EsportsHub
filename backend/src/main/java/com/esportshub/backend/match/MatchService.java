package com.esportshub.backend.match;

import com.esportshub.backend.bracket.Match;
import com.esportshub.backend.bracket.MatchRepository;
import com.esportshub.backend.bracket.MatchStatus;
import com.esportshub.backend.bracket.MatchView;
import com.esportshub.backend.tournament.Tournament;
import com.esportshub.backend.tournament.TournamentRepository;
import com.esportshub.backend.tournament.TournamentStatus;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional
public class MatchService {

    private static final String REFEREE_ROLE = "REFEREE";

    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final TournamentRepository tournamentRepository;
    private final ApplicationEventPublisher eventPublisher;

    public MatchView assignReferee(MatchActor actor, Long matchId, AssignRefereeRequest request) {
        Match match = findMatch(matchId);

        if (!isOrganizer(actor, match) && !actor.admin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "samo organizator ili admin");
        }

        User referee = userRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Korisnik ne postoji"));

        if (referee.getRoles().stream().noneMatch(role -> REFEREE_ROLE.equals(role.getName()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "korisnik nije sudija");
        }

        match.setReferee(referee);
        matchRepository.save(match);

        publish(match, actor, MatchEvent.REFEREE_ASSIGNED, data("referee", referee.getUsername()));
        return MatchView.from(match);
    }

    public MatchView start(MatchActor actor, Long matchId) {
        Match match = findMatch(matchId);
        requireControl(actor, match);

        if (match.getTeamA() == null || match.getTeamB() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "mec nema oba tima");
        }

        transition(match, MatchStatus.LIVE);
        match.setStartedAt(Instant.now());
        matchRepository.save(match);

        publish(match, actor, MatchEvent.STARTED, data(
                "teamAId", match.getTeamA().getId(),
                "teamBId", match.getTeamB().getId()));
        return MatchView.from(match);
    }

    public MatchView updateScore(MatchActor actor, Long matchId, ScoreRequest request) {
        Match match = findMatch(matchId);
        requireControl(actor, match);

        if (match.getStatus() != MatchStatus.LIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "mec nije uzivo");
        }

        match.setScoreA(request.scoreA());
        match.setScoreB(request.scoreB());
        matchRepository.save(match);

        publish(match, actor, MatchEvent.SCORE_UPDATED, data(
                "scoreA", match.getScoreA(),
                "scoreB", match.getScoreB()));
        return MatchView.from(match);
    }

    public MatchView finish(MatchActor actor, Long matchId, ScoreRequest request) {
        Match match = findMatch(matchId);
        requireControl(actor, match);

        if (request.scoreA().equals(request.scoreB())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nerijeseno nije dozvoljeno");
        }

        transition(match, MatchStatus.FINISHED);
        match.setScoreA(request.scoreA());
        match.setScoreB(request.scoreB());
        match.setWinnerTeam(request.scoreA() > request.scoreB() ? match.getTeamA() : match.getTeamB());
        match.setEndedAt(Instant.now());
        matchRepository.save(match);

        publish(match, actor, MatchEvent.FINISHED, data(
                "scoreA", match.getScoreA(),
                "scoreB", match.getScoreB(),
                "winnerTeamId", match.getWinnerTeam().getId(),
                "nextMatchId", match.getNextMatchId()));

        if (match.getNextMatchId() != null) {
            advanceWinner(actor, match);
        } else {
            completeTournament(actor, match);
        }

        return MatchView.from(match);
    }

    @Transactional(readOnly = true)
    public AgentKeyResponse agentKey(MatchActor actor, Long matchId) {
        Match match = findMatch(matchId);
        requireControl(actor, match);
        return new AgentKeyResponse(match.getSpectatorKey());
    }

    @Transactional(readOnly = true)
    public List<LiveMatchResponse> liveOverview() {
        List<Match> live = matchRepository.findByStatusOrderByStartedAtAscIdAsc(MatchStatus.LIVE);
        List<Match> upcoming = matchRepository
                .findTop10ByStatusAndTeamAIsNotNullAndTeamBIsNotNullAndTournament_StatusOrderByIdAsc(
                        MatchStatus.SCHEDULED, TournamentStatus.ONGOING);
        return Stream.concat(live.stream(), upcoming.stream())
                .map(LiveMatchResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public MatchView get(Long matchId) {
        return MatchView.from(findMatch(matchId));
    }

    private void advanceWinner(MatchActor actor, Match match) {
        Match next = findMatch(match.getNextMatchId());
        List<Match> feeders = matchRepository.findByNextMatchIdOrderByIdAsc(next.getId());
        boolean firstFeeder = feeders.get(0).getId().equals(match.getId());

        if (firstFeeder) {
            next.setTeamA(match.getWinnerTeam());
        } else {
            next.setTeamB(match.getWinnerTeam());
        }
        matchRepository.save(next);

        publish(match, actor, MatchEvent.WINNER_ADVANCED, data(
                "winnerTeamId", match.getWinnerTeam().getId(),
                "nextMatchId", next.getId(),
                "slot", firstFeeder ? "A" : "B"));
    }

    private void completeTournament(MatchActor actor, Match finalMatch) {
        Tournament tournament = finalMatch.getTournament();
        tournament.setStatus(TournamentStatus.COMPLETED);
        tournamentRepository.save(tournament);

        publish(finalMatch, actor, MatchEvent.TOURNAMENT_COMPLETED, data(
                "winnerTeamId", finalMatch.getWinnerTeam().getId()));
    }

    private void transition(Match match, MatchStatus target) {
        if (!match.getStatus().canTransitionTo(target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "nedozvoljen prelaz: " + match.getStatus() + " -> " + target);
        }
        match.setStatus(target);
    }

    private void publish(Match match, MatchActor actor, String type, Map<String, Object> data) {
        eventPublisher.publishEvent(new MatchEvent(match.getId(), match.getTournament().getId(), type, actor.username(), data));
    }

    private static Map<String, Object> data(Object... keysAndValues) {
        Map<String, Object> data = new LinkedHashMap<>();
        for (int i = 0; i < keysAndValues.length; i += 2) {
            data.put((String) keysAndValues[i], keysAndValues[i + 1]);
        }
        return data;
    }

    private void requireControl(MatchActor actor, Match match) {
        if (!isReferee(actor, match) && !isOrganizer(actor, match) && !actor.admin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "nemas pravo nad ovim mecom");
        }
    }

    private static boolean isReferee(MatchActor actor, Match match) {
        return match.getReferee() != null && match.getReferee().getUsername().equals(actor.username());
    }

    private static boolean isOrganizer(MatchActor actor, Match match) {
        return match.getTournament().getOrganizer().getUsername().equals(actor.username());
    }

    private Match findMatch(Long matchId) {
        return matchRepository.findById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mec ne postoji"));
    }
}
