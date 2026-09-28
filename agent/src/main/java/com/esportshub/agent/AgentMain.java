package com.esportshub.agent;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.concurrent.TimeUnit;

public final class AgentMain {

    private static volatile boolean running = true;

    private AgentMain() {
    }

    public static void main(String[] args) {
        AgentConfig config;
        try {
            config = AgentConfig.parse(args, System.getenv());
        } catch (IllegalArgumentException e) {
            Log.error(e.getMessage());
            System.err.println(AgentConfig.USAGE);
            System.exit(2);
            return;
        }

        ObjectMapper objectMapper = JsonMapper.builder().build();
        SnapshotSource source = createSource(config);

        SnapshotPublisher publisher;
        try {
            publisher = new SnapshotPublisher(config, objectMapper);
        } catch (Exception e) {
            Log.error("spajanje na RabbitMQ " + config.rabbitHost() + ":" + config.rabbitPort() + " nije uspjelo: " + e.getMessage());
            System.exit(1);
            return;
        }

        Thread mainThread = Thread.currentThread();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            running = false;
            mainThread.interrupt();
            try {
                mainThread.join(3000);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
        }));

        Log.info("agent pokrenut (" + (config.mock() ? "mock" : "stvarni") + " mod, interval "
                + config.intervalSeconds() + "s, tim A = " + config.sideA() + ")");

        try (publisher) {
            run(config, source, publisher);
        }
        Log.info("agent zaustavljen");
    }

    private static void run(AgentConfig config, SnapshotSource source, SnapshotPublisher publisher) {
        while (running && !source.finished()) {
            source.next().ifPresent(message -> send(publisher, message));
            try {
                TimeUnit.SECONDS.sleep(config.intervalSeconds());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    private static void send(SnapshotPublisher publisher, LiveSnapshotMessage message) {
        try {
            publisher.publish(message);
            Log.info("poslano: " + clock(message.gameTimeSeconds())
                    + " kills " + message.killsA() + "-" + message.killsB()
                    + " tornjevi " + message.towersA() + "-" + message.towersB());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            Log.error("slanje nije uspjelo: " + e.getMessage());
        }
    }

    private static SnapshotSource createSource(AgentConfig config) {
        throw new IllegalStateException("mod jos nije podrzan");
    }

    private static String clock(Integer seconds) {
        if (seconds == null) {
            return "--:--";
        }
        return String.format("%d:%02d", seconds / 60, seconds % 60);
    }
}
