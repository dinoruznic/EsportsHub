package com.esportshub.backend.live;

import com.esportshub.backend.match.MatchActor;
import com.esportshub.backend.match.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class LiveSimulatorService {

    private static final int MAX_TOWERS = 11;

    private final MatchService matchService;
    private final LiveSnapshotService liveSnapshotService;
    private final RabbitTemplate rabbitTemplate;

    public LiveSnapshotMessage simulate(MatchActor actor, Long matchId) {
        String matchKey = matchService.agentKey(actor, matchId).matchKey();
        LiveSnapshotResponse previous = liveSnapshotService.latest(matchId).orElse(null);
        ThreadLocalRandom random = ThreadLocalRandom.current();

        LiveSnapshotMessage message = new LiveSnapshotMessage(
                matchKey,
                Instant.now(),
                value(previous == null ? null : previous.gameTimeSeconds(), 0) + random.nextInt(45, 91),
                value(previous == null ? null : previous.killsA(), 0) + random.nextInt(0, 3),
                value(previous == null ? null : previous.killsB(), 0) + random.nextInt(0, 3),
                value(previous == null ? null : previous.goldA(), 2500) + random.nextInt(1200, 2601),
                value(previous == null ? null : previous.goldB(), 2500) + random.nextInt(1200, 2601),
                tower(previous == null ? null : previous.towersA(), random),
                tower(previous == null ? null : previous.towersB(), random),
                Map.of("simulated", true));

        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "match." + matchId + ".snapshot", message);
        return message;
    }

    private static int value(Integer previous, int fallback) {
        return previous == null ? fallback : previous;
    }

    private static int tower(Integer previous, ThreadLocalRandom random) {
        int towers = value(previous, 0) + (random.nextInt(4) == 0 ? 1 : 0);
        return Math.min(towers, MAX_TOWERS);
    }
}
