package com.esportshub.backend.live;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LiveSnapshotListener {

    private final LiveSnapshotService liveSnapshotService;

    @RabbitListener(queues = RabbitConfig.QUEUE)
    public void onSnapshot(LiveSnapshotMessage message) {
        liveSnapshotService.ingest(message);
    }
}
