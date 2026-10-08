package com.esportshub.backend.match;

import com.esportshub.backend.bracket.Match;
import com.esportshub.backend.bracket.MatchRepository;
import com.esportshub.backend.bracket.MatchStatus;
import com.esportshub.backend.team.Team;
import com.esportshub.backend.team.TeamMembershipRepository;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;

@Component
@RequiredArgsConstructor
public class RefereeAssigner {

    public static final String SYSTEM_ACTOR = "SISTEM";

    private static final String REFEREE_ROLE = "REFEREE";
    private static final List<MatchStatus> OPEN_STATUSES = List.of(MatchStatus.SCHEDULED, MatchStatus.LIVE);

    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final ApplicationEventPublisher eventPublisher;

    public Optional<Team> conflictTeam(User referee, Match match) {
        return Stream.of(match.getTeamA(), match.getTeamB())
                .filter(Objects::nonNull)
                .filter(team -> belongsTo(referee, team))
                .findFirst();
    }

    public boolean belongsTo(User user, Team team) {
        return team.getCaptain().getUsername().equals(user.getUsername())
                || teamMembershipRepository.existsByTeam_IdAndGameAccount_User_UsernameAndActiveTrue(
                        team.getId(), user.getUsername());
    }

    public Optional<User> assignIfMissing(Match match) {
        if (match.getReferee() != null || match.getTeamA() == null || match.getTeamB() == null) {
            return Optional.empty();
        }

        Optional<User> chosen = userRepository.findByRoles_NameOrderByUsernameAsc(REFEREE_ROLE).stream()
                .filter(candidate -> conflictTeam(candidate, match).isEmpty())
                .min(Comparator.comparingLong(this::openMatches).thenComparing(User::getUsername));

        chosen.ifPresent(referee -> {
            match.setReferee(referee);
            match.setRefereeAuto(true);
            matchRepository.save(match);

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("referee", referee.getUsername());
            data.put("automatic", true);
            eventPublisher.publishEvent(new MatchEvent(
                    match.getId(), match.getTournament().getId(), MatchEvent.REFEREE_ASSIGNED, SYSTEM_ACTOR, data));
        });
        return chosen;
    }

    private long openMatches(User referee) {
        return matchRepository.countByReferee_IdAndStatusIn(referee.getId(), OPEN_STATUSES);
    }
}
