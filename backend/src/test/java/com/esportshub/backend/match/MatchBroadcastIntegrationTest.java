package com.esportshub.backend.match;

import com.esportshub.backend.auth.JwtService;
import com.esportshub.backend.bracket.BracketResponse;
import com.esportshub.backend.bracket.BracketService;
import com.esportshub.backend.game.Game;
import com.esportshub.backend.game.GameRepository;
import com.esportshub.backend.team.Team;
import com.esportshub.backend.team.TeamRepository;
import com.esportshub.backend.tournament.RegistrationStatus;
import com.esportshub.backend.tournament.Tournament;
import com.esportshub.backend.tournament.TournamentRegistration;
import com.esportshub.backend.tournament.TournamentRegistrationRepository;
import com.esportshub.backend.tournament.TournamentRepository;
import com.esportshub.backend.tournament.TournamentStatus;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class MatchBroadcastIntegrationTest {

    @Value("${local.server.port}")
    private int port;

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private GameRepository gameRepository;
    @Autowired
    private TeamRepository teamRepository;
    @Autowired
    private TournamentRepository tournamentRepository;
    @Autowired
    private TournamentRegistrationRepository tournamentRegistrationRepository;
    @Autowired
    private BracketService bracketService;
    @Autowired
    private MatchEventLogger matchEventLogger;
    @Autowired
    private JwtService jwtService;

    private final HttpClient http = HttpClient.newHttpClient();
    private final List<User> users = new ArrayList<>();
    private final List<Team> teams = new ArrayList<>();
    private Tournament tournament;
    private User organizer;
    private StompSession session;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 4);
        Game game = gameRepository.findByCode("LOL").orElseThrow();

        organizer = saveUser("wsorg" + suffix);
        tournament = tournamentRepository.save(Tournament.builder()
                .name("WS test " + suffix)
                .game(game)
                .format("SINGLE_ELIMINATION")
                .maxTeams(4)
                .status(TournamentStatus.REGISTRATION)
                .organizer(organizer)
                .build());

        for (int i = 0; i < 4; i++) {
            User captain = saveUser("wscap" + suffix + i);
            Team team = teamRepository.save(Team.builder()
                    .name("WS " + suffix + " " + i)
                    .tag((char) ('A' + i) + suffix)
                    .game(game)
                    .captain(captain)
                    .build());
            teams.add(team);
            tournamentRegistrationRepository.save(TournamentRegistration.builder()
                    .tournament(tournament)
                    .team(team)
                    .status(RegistrationStatus.REGISTERED)
                    .build());
        }
    }

    @AfterEach
    void tearDown() {
        if (session != null && session.isConnected()) {
            session.disconnect();
        }
        tournamentRepository.deleteById(tournament.getId());
        teamRepository.deleteAll(teams);
        userRepository.deleteAll(users);
    }

    @Test
    void finishingSemifinalBroadcastsCommittedStateInOrder() throws Exception {
        BracketResponse bracket = bracketService.generate(organizer.getUsername(), false, tournament.getId());
        Long semifinalId = bracket.rounds().get(0).matches().get(0).id();
        Long finalId = bracket.rounds().get(1).matches().get(0).id();

        BlockingQueue<Map<String, Object>> tournamentTopic = new LinkedBlockingQueue<>();
        BlockingQueue<Map<String, Object>> matchTopic = new LinkedBlockingQueue<>();
        connect();
        subscribe("/topic/tournaments/" + tournament.getId(), tournamentTopic);
        subscribe("/topic/matches/" + semifinalId, matchTopic);
        Thread.sleep(500);

        String token = jwtService.generateToken(organizer.getUsername());
        assertThat(call("POST", "/api/matches/" + semifinalId + "/start", token, null)).isEqualTo(200);
        assertThat(call("PUT", "/api/matches/" + semifinalId + "/score", token, "{\"scoreA\":1,\"scoreB\":0}")).isEqualTo(200);
        assertThat(call("POST", "/api/matches/" + semifinalId + "/finish", token, "{\"scoreA\":2,\"scoreB\":1}")).isEqualTo(200);

        List<Map<String, Object>> received = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            Map<String, Object> message = tournamentTopic.poll(5, TimeUnit.SECONDS);
            assertThat(message).as("poruka #%d na tournament topicu", i + 1).isNotNull();
            received.add(message);
        }

        assertThat(received).extracting(m -> m.get("type")).containsExactly(
                MatchEvent.STARTED,
                MatchEvent.SCORE_UPDATED,
                MatchEvent.FINISHED,
                MatchEvent.WINNER_ADVANCED,
                MatchEvent.WINNER_ADVANCED);
        assertThat(received).extracting(m -> m.get("actor")).containsOnly(organizer.getUsername());

        assertThat(match(received.get(0))).containsEntry("status", "LIVE");
        assertThat(match(received.get(1))).containsEntry("scoreA", 1).containsEntry("scoreB", 0);

        Map<String, Object> finished = match(received.get(2));
        assertThat(finished).containsEntry("status", "FINISHED").containsEntry("scoreA", 2).containsEntry("scoreB", 1);
        Object winnerId = team(finished, "teamA").get("id");
        assertThat(finished).containsEntry("winnerTeamId", winnerId);

        assertThat(number(received.get(4).get("matchId"))).isEqualTo(finalId);
        assertThat(team(match(received.get(4)), "teamA")).containsEntry("id", winnerId);

        Map<String, Object> firstOnMatchTopic = matchTopic.poll(5, TimeUnit.SECONDS);
        assertThat(firstOnMatchTopic).isNotNull().containsEntry("type", MatchEvent.STARTED)
                .containsEntry("actor", organizer.getUsername());

        List<MatchEventResponse> log = matchEventLogger.findByMatch(semifinalId);
        assertThat(log).extracting(MatchEventResponse::type).containsExactly(
                MatchEvent.STARTED, MatchEvent.SCORE_UPDATED, MatchEvent.FINISHED, MatchEvent.WINNER_ADVANCED);
        assertThat(log).extracting(MatchEventResponse::source).containsOnly("ORGANIZER");
        assertThat(log).extracting(MatchEventResponse::actor).containsOnly(organizer.getUsername());
    }

    private User saveUser(String username) {
        User user = userRepository.save(User.builder()
                .username(username)
                .email(username + "@esportshub.test")
                .passwordHash("x")
                .build());
        users.add(user);
        return user;
    }

    private void connect() throws Exception {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new JacksonJsonMessageConverter());
        session = client.connectAsync("ws://localhost:" + port + "/ws", new StompSessionHandlerAdapter() {
        }).get(5, TimeUnit.SECONDS);
    }

    private void subscribe(String destination, BlockingQueue<Map<String, Object>> queue) {
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            @SuppressWarnings("unchecked")
            public void handleFrame(StompHeaders headers, Object payload) {
                queue.add((Map<String, Object>) payload);
            }
        });
    }

    private int call(String method, String path, String token, String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> match(Map<String, Object> message) {
        return (Map<String, Object>) message.get("match");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> team(Map<String, Object> match, String slot) {
        return (Map<String, Object>) match.get(slot);
    }

    private static Long number(Object value) {
        return ((Number) value).longValue();
    }
}
