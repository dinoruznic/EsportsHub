package com.esportshub.backend.demo;

import com.esportshub.backend.bracket.Match;
import com.esportshub.backend.bracket.MatchRepository;
import com.esportshub.backend.bracket.MatchStatus;
import com.esportshub.backend.live.LiveSnapshotMessage;
import com.esportshub.backend.live.RabbitConfig;
import com.esportshub.backend.match.MatchActor;
import com.esportshub.backend.match.MatchEvent;
import com.esportshub.backend.match.MatchService;
import com.esportshub.backend.match.ScoreRequest;
import com.esportshub.backend.tournament.Tournament;
import com.esportshub.backend.tournament.TournamentRepository;
import com.esportshub.backend.tournament.TournamentStatus;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@ConditionalOnProperty(name = "esportshub.demo.enabled", havingValue = "true")
public class DemoRunner {

    static final String ROUTING_KEY = "match.agent.snapshot";

    private static final MatchActor ACTOR = new MatchActor(MatchEvent.DEMO_ACTOR, true);
    private static final int MAX_LIVE = 2;
    private static final int SERIES_WINS = 2;
    private static final int FINAL_WINS = 3;

    private final MatchRepository matchRepository;
    private final TournamentRepository tournamentRepository;
    private final MatchService matchService;
    private final RabbitTemplate rabbitTemplate;
    private final long tickMillis;
    private final int ticksPerMap;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(task -> {
        Thread thread = new Thread(task, "demo-runner");
        thread.setDaemon(true);
        return thread;
    });
    private final Random random = new Random();
    private final Map<Long, DemoGame> games = new HashMap<>();

    private ScheduledFuture<?> task;
    private Long tournamentId;
    private Instant startedAt;
    private long snapshotsSent;

    public DemoRunner(MatchRepository matchRepository,
                      TournamentRepository tournamentRepository,
                      MatchService matchService,
                      RabbitTemplate rabbitTemplate,
                      @Value("${esportshub.demo.tick-millis:2000}") long tickMillis,
                      @Value("${esportshub.demo.ticks-per-map:30}") int ticksPerMap) {
        this.matchRepository = matchRepository;
        this.tournamentRepository = tournamentRepository;
        this.matchService = matchService;
        this.rabbitTemplate = rabbitTemplate;
        this.tickMillis = tickMillis;
        this.ticksPerMap = ticksPerMap;
    }

    public synchronized DemoStatusResponse start(Long requestedTournamentId) {
        Tournament tournament = requestedTournamentId == null ? defaultTournament() : ongoing(requestedTournamentId);
        stop();
        tournamentId = tournament.getId();
        startedAt = Instant.now();
        snapshotsSent = 0;
        task = scheduler.scheduleWithFixedDelay(this::tick, 0, tickMillis, TimeUnit.MILLISECONDS);
        return status();
    }

    public synchronized DemoStatusResponse stop() {
        if (task != null) {
            task.cancel(false);
            task = null;
        }
        games.clear();
        return status();
    }

    public synchronized DemoStatusResponse status() {
        long live = tournamentId == null ? 0 : matchRepository.countByTournament_IdAndStatus(tournamentId, MatchStatus.LIVE);
        return new DemoStatusResponse(task != null, tournamentId, live, snapshotsSent, task != null ? startedAt : null);
    }

    synchronized void tick() {
        if (task == null) {
            return;
        }
        try {
            Tournament tournament = tournamentRepository.findById(tournamentId).orElse(null);
            if (tournament == null || tournament.getStatus() != TournamentStatus.ONGOING) {
                stop();
                return;
            }
            fillLiveSlots();
            matchRepository.findByTournament_IdAndStatusOrderByIdAsc(tournamentId, MatchStatus.LIVE).forEach(this::play);
            if (tournamentRepository.findById(tournamentId).map(Tournament::getStatus).orElse(null) != TournamentStatus.ONGOING) {
                stop();
            }
        } catch (RuntimeException e) {
            log.warn("Demo korak nije uspio: {}", e.getMessage());
        }
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }

    private void fillLiveSlots() {
        long live = matchRepository.countByTournament_IdAndStatus(tournamentId, MatchStatus.LIVE);
        List<Match> ready = matchRepository.findByTournament_IdAndStatusOrderByIdAsc(tournamentId, MatchStatus.SCHEDULED).stream()
                .filter(match -> match.getTeamA() != null && match.getTeamB() != null)
                .limit(Math.max(0, MAX_LIVE - live))
                .toList();
        ready.forEach(match -> matchService.start(ACTOR, match.getId()));
    }

    private void play(Match match) {
        DemoGame game = games.computeIfAbsent(match.getId(), id -> new DemoGame(match.getSpectatorKey(), random));

        if (game.ticks() < ticksPerMap) {
            LiveSnapshotMessage snapshot = game.next(Instant.now());
            rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, ROUTING_KEY, snapshot);
            snapshotsSent++;
            return;
        }

        int scoreA = match.getScoreA() + (game.sideAWinsMap() ? 1 : 0);
        int scoreB = match.getScoreB() + (scoreA == match.getScoreA() ? 1 : 0);
        int needed = match.getNextMatchId() == null ? FINAL_WINS : SERIES_WINS;
        games.remove(match.getId());

        ScoreRequest score = new ScoreRequest(scoreA, scoreB);
        if (Math.max(scoreA, scoreB) >= needed) {
            matchService.finish(ACTOR, match.getId(), score);
        } else {
            matchService.updateScore(ACTOR, match.getId(), score);
        }
    }

    private Tournament defaultTournament() {
        List<Tournament> ongoing = tournamentRepository.findByStatus(TournamentStatus.ONGOING);
        return ongoing.stream()
                .filter(tournament -> DemoSeeder.SARAJEVO_OPEN.equals(tournament.getName()))
                .findFirst()
                .or(() -> ongoing.stream().findFirst())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Nema turnira u toku za demo"));
    }

    private Tournament ongoing(Long id) {
        Tournament tournament = tournamentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Turnir ne postoji"));
        if (tournament.getStatus() != TournamentStatus.ONGOING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Turnir nije u toku");
        }
        return tournament;
    }
}
