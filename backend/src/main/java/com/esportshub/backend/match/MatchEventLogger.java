package com.esportshub.backend.match;

import com.esportshub.backend.bracket.Match;
import com.esportshub.backend.bracket.MatchRepository;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

@Component
@RequiredArgsConstructor
public class MatchEventLogger {

    private static final String SOURCE_REFEREE = "REFEREE";
    private static final String SOURCE_ORGANIZER = "ORGANIZER";
    private static final String SOURCE_ADMIN = "ADMIN";
    private static final String SOURCE_RIOT = "RIOT";
    private static final String SOURCE_SYSTEM = "SISTEM";
    private static final String SOURCE_DEMO = "DEMO";

    private final MatchEventRecordRepository matchEventRecordRepository;
    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @EventListener
    public void on(MatchEvent event) {
        if (MatchEvent.LIVE_SNAPSHOT.equals(event.type())) {
            return;
        }

        boolean system = RefereeAssigner.SYSTEM_ACTOR.equals(event.actor());
        boolean demo = MatchEvent.DEMO_ACTOR.equals(event.actor());
        User actor = event.actor() == null || system || demo
                ? null
                : userRepository.findByUsername(event.actor()).orElse(null);
        Match match = matchRepository.getReferenceById(event.matchId());

        matchEventRecordRepository.save(MatchEventRecord.builder()
                .matchId(event.matchId())
                .type(event.type())
                .source(system ? SOURCE_SYSTEM : demo ? SOURCE_DEMO : sourceOf(event.actor(), match))
                .createdBy(actor)
                .payload(objectMapper.writeValueAsString(event.data()))
                .build());
    }

    @Transactional(readOnly = true)
    public List<MatchEventResponse> findByMatch(Long matchId) {
        return matchEventRecordRepository.findByMatchIdOrderByCreatedAtAscIdAsc(matchId).stream()
                .map(record -> new MatchEventResponse(
                        record.getId(),
                        record.getMatchId(),
                        record.getType(),
                        record.getSource(),
                        actorOf(record),
                        record.getPayload() == null ? null : objectMapper.readTree(record.getPayload()),
                        record.getCreatedAt()))
                .toList();
    }

    private static String actorOf(MatchEventRecord record) {
        if (record.getCreatedBy() != null) {
            return record.getCreatedBy().getUsername();
        }
        if (SOURCE_DEMO.equals(record.getSource())) {
            return MatchEvent.DEMO_ACTOR;
        }
        return SOURCE_SYSTEM.equals(record.getSource()) ? RefereeAssigner.SYSTEM_ACTOR : null;
    }

    private static String sourceOf(String actor, Match match) {
        if (MatchEvent.RIOT_AGENT.equals(actor)) {
            return SOURCE_RIOT;
        }
        if (match.getReferee() != null && match.getReferee().getUsername().equals(actor)) {
            return SOURCE_REFEREE;
        }
        if (match.getTournament().getOrganizer().getUsername().equals(actor)) {
            return SOURCE_ORGANIZER;
        }
        return SOURCE_ADMIN;
    }
}
