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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MatchService {

    private static final String REFEREE_ROLE = "REFEREE";

    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final TournamentRepository tournamentRepository;

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
        return MatchView.from(matchRepository.save(match));
    }

    public MatchView start(MatchActor actor, Long matchId) {
        Match match = findMatch(matchId);
        requireControl(actor, match);

        if (match.getTeamA() == null || match.getTeamB() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "mec nema oba tima");
        }

        transition(match, MatchStatus.LIVE);
        match.setStartedAt(Instant.now());
        return MatchView.from(matchRepository.save(match));
    }

    public MatchView updateScore(MatchActor actor, Long matchId, ScoreRequest request) {
        Match match = findMatch(matchId);
        requireControl(actor, match);

        if (match.getStatus() != MatchStatus.LIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "mec nije uzivo");
        }

        match.setScoreA(request.scoreA());
        match.setScoreB(request.scoreB());
        return MatchView.from(matchRepository.save(match));
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

        if (match.getNextMatchId() != null) {
            advanceWinner(match);
        } else {
            completeTournament(match.getTournament());
        }

        return MatchView.from(match);
    }

    @Transactional(readOnly = true)
    public MatchView get(Long matchId) {
        return MatchView.from(findMatch(matchId));
    }

    private void advanceWinner(Match match) {
        Match next = findMatch(match.getNextMatchId());
        List<Match> feeders = matchRepository.findByNextMatchIdOrderByIdAsc(next.getId());

        if (feeders.get(0).getId().equals(match.getId())) {
            next.setTeamA(match.getWinnerTeam());
        } else {
            next.setTeamB(match.getWinnerTeam());
        }

        matchRepository.save(next);
    }

    private void completeTournament(Tournament tournament) {
        tournament.setStatus(TournamentStatus.COMPLETED);
        tournamentRepository.save(tournament);
    }

    private void transition(Match match, MatchStatus target) {
        if (!match.getStatus().canTransitionTo(target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "nedozvoljen prelaz: " + match.getStatus() + " -> " + target);
        }
        match.setStatus(target);
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
