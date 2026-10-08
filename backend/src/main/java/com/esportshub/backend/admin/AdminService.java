package com.esportshub.backend.admin;

import com.esportshub.backend.bracket.MatchRepository;
import com.esportshub.backend.bracket.MatchStatus;
import com.esportshub.backend.market.ListingStatus;
import com.esportshub.backend.market.TransferListingRepository;
import com.esportshub.backend.team.TeamRepository;
import com.esportshub.backend.tournament.TournamentRepository;
import com.esportshub.backend.tournament.TournamentStatus;
import com.esportshub.backend.user.Role;
import com.esportshub.backend.user.RoleRepository;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private static final String ADMIN_ROLE = "ADMIN";
    private static final Set<String> MANAGED_ROLES = Set.of("ORGANIZER", "REFEREE", ADMIN_ROLE);
    private static final int MAX_PAGE_SIZE = 100;
    private static final List<TournamentStatus> STAT_STATUSES = List.of(
            TournamentStatus.PENDING,
            TournamentStatus.REGISTRATION,
            TournamentStatus.ONGOING,
            TournamentStatus.COMPLETED,
            TournamentStatus.REJECTED,
            TournamentStatus.CANCELLED);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TeamRepository teamRepository;
    private final TournamentRepository tournamentRepository;
    private final MatchRepository matchRepository;
    private final TransferListingRepository transferListingRepository;

    public List<String> grantRole(String username, RoleGrantRequest request) {
        User user = findUser(username);
        Role role = managedRole(request.role());

        if (hasRole(user, role.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Korisnik vec ima ovu ulogu");
        }

        user.getRoles().add(role);
        userRepository.save(user);
        return roleNames(user);
    }

    public List<String> revokeRole(String actorUsername, String username, String roleName) {
        User user = findUser(username);
        Role role = managedRole(roleName);

        if (ADMIN_ROLE.equals(role.getName()) && user.getUsername().equals(actorUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ne mozes ukloniti svoju admin ulogu");
        }

        if (!hasRole(user, role.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Korisnik nema ovu ulogu");
        }

        user.getRoles().removeIf(existing -> existing.getName().equals(role.getName()));
        userRepository.save(user);
        return roleNames(user);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> users(String query, String role, int page, int size) {
        String trimmed = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        String pattern = trimmed.isEmpty() ? "" : "%" + trimmed + "%";
        String roleFilter = role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.clamp(size, 1, MAX_PAGE_SIZE),
                Sort.by("username"));

        return PageResponse.from(userRepository.search(pattern, roleFilter, pageable), AdminUserResponse::from);
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse stats() {
        Map<String, Long> tournaments = new LinkedHashMap<>();
        for (TournamentStatus status : STAT_STATUSES) {
            tournaments.put(status.name(), tournamentRepository.countByStatus(status));
        }

        return new AdminStatsResponse(
                userRepository.count(),
                teamRepository.count(),
                tournaments,
                matchRepository.countByStatus(MatchStatus.LIVE),
                transferListingRepository.countByStatus(ListingStatus.OPEN));
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Korisnik ne postoji"));
    }

    private Role managedRole(String name) {
        Role role = roleRepository.findByName(name.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "nepostojeca uloga"));

        if (!MANAGED_ROLES.contains(role.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ova uloga se ne moze mijenjati");
        }
        return role;
    }

    private static boolean hasRole(User user, String roleName) {
        return user.getRoles().stream().anyMatch(existing -> existing.getName().equals(roleName));
    }

    private static List<String> roleNames(User user) {
        return user.getRoles().stream()
                .map(Role::getName)
                .sorted()
                .toList();
    }
}
