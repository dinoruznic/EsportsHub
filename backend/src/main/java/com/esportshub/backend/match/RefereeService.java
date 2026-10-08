package com.esportshub.backend.match;

import com.esportshub.backend.bracket.Match;
import com.esportshub.backend.bracket.MatchRepository;
import com.esportshub.backend.bracket.MatchStatus;
import com.esportshub.backend.live.LiveGameSnapshot;
import com.esportshub.backend.live.LiveGameSnapshotRepository;
import com.esportshub.backend.tournament.TournamentRepository;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RefereeService {

    private static final String REFEREE_ROLE = "REFEREE";

    private final MatchRepository matchRepository;
    private final LiveGameSnapshotRepository liveGameSnapshotRepository;
    private final UserRepository userRepository;
    private final TournamentRepository tournamentRepository;

    public List<RefereeMatchResponse> myMatches(MatchActor actor) {
        Map<Long, Match> matches = new LinkedHashMap<>();
        if (actor.admin()) {
            matchRepository.findByStatusOrderByStartedAtAscIdAsc(MatchStatus.LIVE)
                    .forEach(match -> matches.put(match.getId(), match));
            matchRepository.findByStatusAndTeamAIsNotNullAndTeamBIsNotNullOrderByIdAsc(MatchStatus.SCHEDULED)
                    .forEach(match -> matches.put(match.getId(), match));
        }
        matchRepository.findByReferee_UsernameOrderByIdDesc(actor.username())
                .forEach(match -> matches.putIfAbsent(match.getId(), match));

        return matches.values().stream()
                .map(match -> RefereeMatchResponse.from(match, liveGameSnapshotRepository
                        .findTopByMatch_IdOrderByIdDesc(match.getId())
                        .map(LiveGameSnapshot::getCapturedAt)
                        .orElse(null)))
                .toList();
    }

    public List<RefereeResponse> referees(MatchActor actor) {
        if (!actor.admin() && !tournamentRepository.existsByOrganizer_Username(actor.username())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "samo organizator ili admin");
        }
        return userRepository.findByRoles_NameOrderByUsernameAsc(REFEREE_ROLE).stream()
                .map(RefereeResponse::from)
                .toList();
    }
}
