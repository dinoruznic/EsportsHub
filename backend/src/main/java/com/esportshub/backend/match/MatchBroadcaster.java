package com.esportshub.backend.match;

import com.esportshub.backend.bracket.MatchView;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class MatchBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;
    private final MatchService matchService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void on(MatchEvent event) {
        try {
            Instant at = Instant.now();
            send(event, event.matchId(), at);

            if (MatchEvent.WINNER_ADVANCED.equals(event.type()) && event.data().get("nextMatchId") instanceof Number next) {
                send(event, next.longValue(), at);
            }
        } catch (RuntimeException e) {
            log.warn("Broadcast za mec {} nije uspio: {}", event.matchId(), e.getMessage());
        }
    }

    private void send(MatchEvent event, Long matchId, Instant at) {
        MatchView view = matchService.get(matchId);

        messagingTemplate.convertAndSend("/topic/matches/" + matchId,
                new MatchTopicMessage(event.type(), event.actor(), view, at));
        messagingTemplate.convertAndSend("/topic/tournaments/" + event.tournamentId(),
                new TournamentTopicMessage(event.type(), matchId, event.actor(), view, at));
    }
}
