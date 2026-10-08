package com.esportshub.backend.profile;

import com.esportshub.backend.team.Team;
import com.esportshub.backend.team.TeamMembership;
import com.esportshub.backend.team.TeamMembershipRepository;
import com.esportshub.backend.team.TeamRepository;
import com.esportshub.backend.user.Role;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class ProfileService {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamMembershipRepository teamMembershipRepository;

    @Transactional(readOnly = true)
    public MeResponse me(String username) {
        return MeResponse.from(findMe(username));
    }

    public MeResponse updateMe(String username, UpdateMeRequest request) {
        User user = findMe(username);
        String displayName = request.displayName() == null || request.displayName().isBlank()
                ? user.getUsername()
                : request.displayName().trim();
        user.setDisplayName(displayName);
        return MeResponse.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public PlayerProfileResponse player(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Igrac ne postoji"));

        Map<Long, Team> teams = new LinkedHashMap<>();
        teamRepository.findByCaptain_Username(user.getUsername()).forEach(team -> teams.put(team.getId(), team));
        teamMembershipRepository.findByGameAccount_User_UsernameAndActiveTrue(user.getUsername()).stream()
                .map(TeamMembership::getTeam)
                .forEach(team -> teams.putIfAbsent(team.getId(), team));

        List<PlayerTeamResponse> teamResponses = teams.values().stream()
                .sorted(Comparator.comparing(Team::getName))
                .map(team -> PlayerTeamResponse.from(team, user.getUsername()))
                .toList();

        return new PlayerProfileResponse(
                user.getUsername(),
                user.getDisplayName(),
                user.getRoles().stream().map(Role::getName).sorted().toList(),
                user.getCreatedAt(),
                teamResponses);
    }

    private User findMe(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Korisnik nije prijavljen"));
    }
}
