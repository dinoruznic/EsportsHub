package com.esportshub.backend.live;

import com.esportshub.backend.bracket.Match;
import com.esportshub.backend.bracket.MatchRepository;
import com.esportshub.backend.bracket.MatchStatus;
import com.esportshub.backend.match.MatchEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class LiveSnapshotService {

    private final MatchRepository matchRepository;
    private final LiveGameSnapshotRepository liveGameSnapshotRepository;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    public void ingest(LiveSnapshotMessage message) {
        if (message.matchKey() == null) {
            throw new AmqpRejectAndDontRequeueException("snapshot bez matchKey");
        }

        Match match = matchRepository.findBySpectatorKey(message.matchKey())
                .orElseThrow(() -> new AmqpRejectAndDontRequeueException("nepoznat matchKey"));

        if (match.getStatus() != MatchStatus.LIVE) {
            throw new AmqpRejectAndDontRequeueException("mec " + match.getId() + " nije uzivo");
        }

        liveGameSnapshotRepository.save(LiveGameSnapshot.builder()
                .match(match)
                .gameTime(message.gameTimeSeconds())
                .scoreA(message.killsA())
                .scoreB(message.killsB())
                .rawJson(objectMapper.writeValueAsString(extras(message)))
                .capturedAt(message.capturedAt() != null ? message.capturedAt() : Instant.now())
                .build());

        eventPublisher.publishEvent(new MatchEvent(
                match.getId(),
                match.getTournament().getId(),
                MatchEvent.LIVE_SNAPSHOT,
                MatchEvent.RIOT_AGENT,
                stats(message)));
    }

    private static Map<String, Object> stats(LiveSnapshotMessage message) {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("gameTimeSeconds", message.gameTimeSeconds());
        stats.put("killsA", message.killsA());
        stats.put("killsB", message.killsB());
        stats.put("goldA", message.goldA());
        stats.put("goldB", message.goldB());
        stats.put("towersA", message.towersA());
        stats.put("towersB", message.towersB());
        return stats;
    }

    private static Map<String, Object> extras(LiveSnapshotMessage message) {
        Map<String, Object> extras = new LinkedHashMap<>();
        extras.put("goldA", message.goldA());
        extras.put("goldB", message.goldB());
        extras.put("towersA", message.towersA());
        extras.put("towersB", message.towersB());
        extras.put("raw", message.raw());
        return extras;
    }
}
