package com.esportshub.backend.match;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

@Component
@RequiredArgsConstructor
public class MatchEventLogger {

    private static final String SOURCE = "REFEREE";

    private final MatchEventRecordRepository matchEventRecordRepository;
    private final ObjectMapper objectMapper;

    @EventListener
    public void on(MatchEvent event) {
        matchEventRecordRepository.save(MatchEventRecord.builder()
                .matchId(event.matchId())
                .type(event.type())
                .source(SOURCE)
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
                        record.getPayload() == null ? null : objectMapper.readTree(record.getPayload()),
                        record.getCreatedAt()))
                .toList();
    }
}
