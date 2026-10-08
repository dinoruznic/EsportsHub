package com.esportshub.backend.demo;

import com.esportshub.backend.bracket.BracketService;
import com.esportshub.backend.bracket.Match;
import com.esportshub.backend.bracket.MatchRepository;
import com.esportshub.backend.game.Game;
import com.esportshub.backend.game.GamePositionRepository;
import com.esportshub.backend.game.GameRankRepository;
import com.esportshub.backend.game.GameRegionRepository;
import com.esportshub.backend.game.GameRepository;
import com.esportshub.backend.gameaccount.CreateGameAccountRequest;
import com.esportshub.backend.gameaccount.GameAccountService;
import com.esportshub.backend.market.CreateListingRequest;
import com.esportshub.backend.market.ListingStatus;
import com.esportshub.backend.market.MakeOfferRequest;
import com.esportshub.backend.market.MarketService;
import com.esportshub.backend.market.TransferListingRepository;
import com.esportshub.backend.match.AssignRefereeRequest;
import com.esportshub.backend.match.MatchActor;
import com.esportshub.backend.match.MatchEventRecord;
import com.esportshub.backend.match.MatchEventRecordRepository;
import com.esportshub.backend.match.MatchService;
import com.esportshub.backend.match.ScoreRequest;
import com.esportshub.backend.team.AddMemberRequest;
import com.esportshub.backend.team.CreateTeamRequest;
import com.esportshub.backend.team.Team;
import com.esportshub.backend.team.TeamRepository;
import com.esportshub.backend.team.TeamRole;
import com.esportshub.backend.team.TeamService;
import com.esportshub.backend.tournament.CreateTournamentRequest;
import com.esportshub.backend.tournament.RegisterTeamRequest;
import com.esportshub.backend.tournament.TournamentRepository;
import com.esportshub.backend.tournament.TournamentService;
import com.esportshub.backend.user.Role;
import com.esportshub.backend.user.RoleRepository;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "esportshub.demo.enabled", havingValue = "true")
public class DemoSeeder {

    static final String PASSWORD = "lozinka123";
    static final String SARAJEVO_OPEN = "Sarajevo Open";

    private static final String FORMAT = "SINGLE_ELIMINATION";
    private static final String ORG_SARAJEVO = "org_sarajevo";
    private static final String ORG_MOSTAR = "org_mostar";
    private static final String PLAYER = "PLAYER";
    private static final String ORGANIZER = "ORGANIZER";
    private static final String REFEREE = "REFEREE";
    private static final String EMAIL_DOMAIN = "@esportshub.ba";
    private static final Duration EVENING = Duration.ofHours(14);
    private static final long MATCH_SLOT_MINUTES = 100;

    private static final List<String> AUTUMN_SEEDS = List.of("DD", "BW", "SS", "NN", "MM", "TT", "UU", "BB");
    private static final List<String> AUTUMN_STRENGTH = List.of("BB", "UU", "TT", "MM", "NN", "SS", "BW", "DD");
    private static final List<String> OPEN_SEEDS = List.of("SS", "BW", "NN", "UU", "DD", "MM", "BB", "TT");
    private static final List<String> OPEN_STRENGTH = List.of("TT", "BB", "MM", "DD", "UU", "NN", "BW", "SS");
    private static final List<String> BALKAN_SEEDS = List.of("SS", "DD", "NN", "UU", "MM", "TT", "BB");

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final GameRepository gameRepository;
    private final GameRegionRepository gameRegionRepository;
    private final GamePositionRepository gamePositionRepository;
    private final GameRankRepository gameRankRepository;
    private final GameAccountService gameAccountService;
    private final TeamService teamService;
    private final TeamRepository teamRepository;
    private final MarketService marketService;
    private final TransferListingRepository transferListingRepository;
    private final TournamentService tournamentService;
    private final TournamentRepository tournamentRepository;
    private final BracketService bracketService;
    private final MatchService matchService;
    private final MatchRepository matchRepository;
    private final MatchEventRecordRepository matchEventRecordRepository;

    private String passwordHash;

    @PostConstruct
    void hashPassword() {
        passwordHash = passwordEncoder.encode(PASSWORD);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public DemoResetResponse seed() {
        Instant today = Instant.now().truncatedTo(ChronoUnit.DAYS);

        user(ORG_SARAJEVO, "Sarajevo Esports", ORGANIZER);
        user(ORG_MOSTAR, "Mostar Gaming Liga", ORGANIZER);
        user("sudija_amra", "Amra Hodžić", REFEREE);
        user("sudija_kenan", "Kenan Begić", REFEREE);
        user("sudija_lejla", "Lejla Kovač", REFEREE);

        Long dinoLol = seedDino();
        DemoRoster.LOL_TEAMS.forEach(team -> team(team, "LOL", "EUW"));
        DemoRoster.CS2_TEAMS.forEach(team -> team(team, "CS2", "EU"));
        seedMarket(dinoLol);

        Instant autumnStart = today.minus(Duration.ofDays(21));
        Long autumn = tournament(ORG_SARAJEVO, "Jesenji LoL Kup", 8, 1000, autumnStart.plus(EVENING));
        startBracket(ORG_SARAJEVO, autumn, AUTUMN_SEEDS);
        playRounds(autumn, AUTUMN_STRENGTH, Integer.MAX_VALUE, autumnStart);

        Instant openStart = today.minus(Duration.ofDays(1));
        Long open = tournament(ORG_SARAJEVO, SARAJEVO_OPEN, 8, 1500, openStart.plus(EVENING));
        startBracket(ORG_SARAJEVO, open, OPEN_SEEDS);
        playRounds(open, OPEN_STRENGTH, 1, openStart);
        assignSemifinalReferees(open);

        Long balkan = tournament(ORG_MOSTAR, "Balkan LoL Kup", 8, 2000, today.plus(Duration.ofDays(7)).plus(EVENING));
        tournamentService.approve(balkan);
        BALKAN_SEEDS.forEach(tag -> register(balkan, tag));

        createTournament(ORG_MOSTAR, "CS2 Liga BiH", "CS2", 4, 800, today.plus(Duration.ofDays(14)).plus(EVENING));

        return new DemoResetResponse(
                userRepository.count(),
                teamRepository.count(),
                tournamentRepository.count(),
                transferListingRepository.countByStatus(ListingStatus.OPEN));
    }

    private Long seedDino() {
        user("dino", "Dino Ruznic");
        Long lol = account("dino", "LOL", "yueen8#EUW", "EUW", "MID", "DIAMOND", null);
        account("dino", "CS2", "dino_awp", "EU", "AWP", null, 18450);
        account("dino", "VALORANT", "DinoVal#EU", "EU", "DUELIST", "ASCENDANT", null);
        return lol;
    }

    private void seedMarket(Long dinoLol) {
        Long dinoListing = marketService.createListing("dino", new CreateListingRequest(dinoLol, 700)).id();
        offer("kap_wolves", dinoListing, "BW", 650, "Dobrodošao u tim, treba nam mid.");
        offer("kap_snipers", dinoListing, "SS", 600, "Startna pozicija od prvog dana.");

        user("amar_mehic", "Amar Mehić");
        Long amar = account("amar_mehic", "LOL", "AmarJG#EUW", "EUW", "JUNGLE", "PLATINUM", null);
        Long amarListing = marketService.createListing("amar_mehic", new CreateListingRequest(amar, 350)).id();
        offer("kap_titans", amarListing, "TT", 300, "Treba nam jungler za Balkan LoL Kup.");

        user("haris_delic", "Haris Delić");
        Long haris = account("haris_delic", "CS2", "h4ris", "EU", "ENTRY", null, 15900);
        Long harisListing = marketService.createListing("haris_delic", new CreateListingRequest(haris, 450)).id();
        offer("kap_bulls", harisListing, "BLB", 400, "Probni period od mjesec dana.");

        user("selma_avdic", "Selma Avdić");
        Long selma = account("selma_avdic", "VALORANT", "SelmaV#EU", "EU", "CONTROLLER", "IMMORTAL", null);
        marketService.createListing("selma_avdic", new CreateListingRequest(selma, 300));
    }

    private void team(DemoRoster.DemoTeam team, String gameCode, String region) {
        List<Long> accounts = new ArrayList<>();
        for (DemoRoster.Player player : team.players()) {
            user(player.username(), player.displayName());
            accounts.add(account(player.username(), gameCode, player.inGameName(), region,
                    player.position(), player.rank(), player.rating()));
        }

        Long teamId = teamService.create(team.captain(),
                new CreateTeamRequest(team.name(), team.tag(), game(gameCode).getId(), region, null)).id();
        accounts.forEach(account -> teamService.addMember(team.captain(), teamId,
                new AddMemberRequest(account, TeamRole.STARTER)));
    }

    private void offer(String captain, Long listingId, String tag, int amount, String message) {
        marketService.makeOffer(captain, listingId, new MakeOfferRequest(teamId(tag), amount, message));
    }

    private Long tournament(String organizer, String name, int maxTeams, int prizePool, Instant startDate) {
        return createTournament(organizer, name, "LOL", maxTeams, prizePool, startDate);
    }

    private Long createTournament(String organizer, String name, String gameCode, int maxTeams, int prizePool, Instant startDate) {
        Long id = tournamentService.create(organizer, new CreateTournamentRequest(
                name, game(gameCode).getId(), FORMAT, maxTeams, prizePool, null)).id();
        tournamentRepository.findById(id).orElseThrow().setStartDate(startDate);
        return id;
    }

    private void startBracket(String organizer, Long tournamentId, List<String> seeds) {
        tournamentService.approve(tournamentId);
        seeds.forEach(tag -> register(tournamentId, tag));
        bracketService.generate(organizer, false, tournamentId);
    }

    private void register(Long tournamentId, String tag) {
        Team team = teamRepository.findByTag(tag).orElseThrow();
        tournamentService.register(team.getCaptain().getUsername(), tournamentId, new RegisterTeamRequest(team.getId()));
    }

    private void playRounds(Long tournamentId, List<String> strength, int lastRound, Instant firstDay) {
        int finalRound = rounds(tournamentId).stream().mapToInt(match -> match.getRound().getRoundNumber()).max().orElse(0);
        for (int round = 1; round <= Math.min(lastRound, finalRound); round++) {
            int number = round;
            List<Match> matches = rounds(tournamentId).stream()
                    .filter(match -> match.getRound().getRoundNumber() == number)
                    .toList();
            Instant day = firstDay.plus(Duration.ofDays(round - 1L)).plus(EVENING);
            for (int i = 0; i < matches.size(); i++) {
                Match match = matches.get(i);
                int wins = round == finalRound ? 3 : 2;
                Instant start = day.plus(Duration.ofMinutes(MATCH_SLOT_MINUTES * i));
                Instant end = start.plus(Duration.ofMinutes(wins == 3 ? 170 : 95));
                play(match, strength, wins);
                backdate(match, start, end);
            }
        }
    }

    private void play(Match match, List<String> strength, int wins) {
        int rankA = strength.indexOf(match.getTeamA().getTag());
        int rankB = strength.indexOf(match.getTeamB().getTag());
        boolean aWins = rankA > rankB;
        int loserWins = wins == 3 || Math.abs(rankA - rankB) < 3 ? 1 : 0;

        List<Boolean> maps = new ArrayList<>();
        maps.add(aWins);
        for (int i = 0; i < loserWins; i++) {
            maps.add(!aWins);
        }
        while (maps.size() < wins + loserWins) {
            maps.add(aWins);
        }

        String actorName = match.getReferee() != null
                ? match.getReferee().getUsername()
                : match.getTournament().getOrganizer().getUsername();
        MatchActor actor = new MatchActor(actorName, false);
        matchService.start(actor, match.getId());

        int scoreA = 0;
        int scoreB = 0;
        for (int i = 0; i < maps.size(); i++) {
            if (maps.get(i)) {
                scoreA++;
            } else {
                scoreB++;
            }
            ScoreRequest score = new ScoreRequest(scoreA, scoreB);
            if (i < maps.size() - 1) {
                matchService.updateScore(actor, match.getId(), score);
            } else {
                matchService.finish(actor, match.getId(), score);
            }
        }
    }

    private void backdate(Match match, Instant start, Instant end) {
        match.setStartedAt(start);
        match.setEndedAt(end);

        List<MatchEventRecord> events = matchEventRecordRepository.findByMatchIdOrderByCreatedAtAscIdAsc(match.getId());
        Instant first = start.minus(Duration.ofMinutes(30));
        long step = events.size() < 2 ? 0 : Duration.between(first, end).toSeconds() / (events.size() - 1);
        for (int i = 0; i < events.size(); i++) {
            events.get(i).setCreatedAt(first.plusSeconds(step * i));
        }
    }

    private void assignSemifinalReferees(Long tournamentId) {
        List<Match> semifinals = rounds(tournamentId).stream()
                .filter(match -> match.getRound().getRoundNumber() == 2)
                .toList();
        MatchActor organizer = new MatchActor(ORG_SARAJEVO, false);
        matchService.assignReferee(organizer, semifinals.get(0).getId(), new AssignRefereeRequest("sudija_amra"));
        matchService.assignReferee(organizer, semifinals.get(1).getId(), new AssignRefereeRequest("sudija_kenan"));
    }

    private List<Match> rounds(Long tournamentId) {
        return matchRepository.findByTournament_IdOrderByRound_RoundNumberAscIdAsc(tournamentId);
    }

    private void user(String username, String displayName, String... extraRoles) {
        Set<Role> roles = Arrays.stream(extraRoles)
                .map(this::role)
                .collect(Collectors.toCollection(HashSet::new));
        roles.add(role(PLAYER));

        userRepository.save(User.builder()
                .username(username)
                .email(username.replace('_', '.') + EMAIL_DOMAIN)
                .passwordHash(passwordHash)
                .displayName(displayName)
                .country("BA")
                .roles(roles)
                .build());
    }

    private Long account(String username, String gameCode, String inGameName, String region,
                         String position, String rank, Integer rating) {
        Long gameId = game(gameCode).getId();
        return gameAccountService.create(username, new CreateGameAccountRequest(
                gameId,
                inGameName,
                gameRegionRepository.findByGame_IdAndCode(gameId, region).orElseThrow().getId(),
                gamePositionRepository.findByGame_IdAndCode(gameId, position).orElseThrow().getId(),
                rank == null ? null : gameRankRepository.findByGame_IdAndCode(gameId, rank).orElseThrow().getId(),
                rating)).id();
    }

    private Long teamId(String tag) {
        return teamRepository.findByTag(tag).orElseThrow().getId();
    }

    private Role role(String name) {
        return roleRepository.findByName(name).orElseThrow();
    }

    private Game game(String code) {
        return gameRepository.findByCode(code).orElseThrow();
    }
}
