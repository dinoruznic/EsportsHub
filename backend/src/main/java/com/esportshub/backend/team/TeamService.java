package com.esportshub.backend.team;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.game.GameRepository;
import com.esportshub.backend.gameaccount.GameAccountRepository;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final GameAccountRepository gameAccountRepository;

    public TeamResponse create(String username, CreateTeamRequest request) {
        User captain = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Korisnik nije prijavljen"));

        Game game = gameRepository.findById(request.gameId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown game"));

        String name = request.name().trim();
        String tag = request.tag().trim();

        if (teamRepository.existsByName(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "team name taken");
        }

        if (teamRepository.existsByTag(tag)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "team tag taken");
        }

        Team team = Team.builder()
                .name(name)
                .tag(tag)
                .logoUrl(request.logoUrl())
                .region(request.region())
                .game(game)
                .captain(captain)
                .build();

        return TeamResponse.from(teamRepository.save(team), 0);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> listTeams(Long gameId) {
        List<Team> teams = gameId != null ? teamRepository.findByGame_Id(gameId) : teamRepository.findAll();

        return teams.stream()
                .map(team -> TeamResponse.from(team, countMembers(team.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public TeamDetailResponse getTeam(Long id) {
        Team team = teamRepository.findById(id).orElseThrow(TeamService::teamNotFound);

        List<TeamMemberResponse> members = teamMembershipRepository.findByTeam_IdAndActiveTrue(id).stream()
                .map(TeamMemberResponse::from)
                .toList();

        return new TeamDetailResponse(TeamResponse.from(team, members.size()), members);
    }

    private int countMembers(Long teamId) {
        return teamMembershipRepository.findByTeam_IdAndActiveTrue(teamId).size();
    }

    private static ResponseStatusException teamNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Tim ne postoji");
    }
}
