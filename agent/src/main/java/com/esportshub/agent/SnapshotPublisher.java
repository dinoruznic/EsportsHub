package com.esportshub.agent;

import com.rabbitmq.client.AMQP;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.concurrent.TimeoutException;

public class SnapshotPublisher implements AutoCloseable {

    public static final String EXCHANGE = "esportshub.live";
    public static final String ROUTING_KEY = "match.agent.snapshot";

    private static final long CONFIRM_TIMEOUT_MS = 5000;
    private static final AMQP.BasicProperties PROPERTIES = new AMQP.BasicProperties.Builder()
            .contentType("application/json")
            .contentEncoding("UTF-8")
            .deliveryMode(2)
            .build();

    private final ObjectMapper objectMapper;
    private final Connection connection;
    private Channel channel;

    public SnapshotPublisher(AgentConfig config, ObjectMapper objectMapper) throws IOException, TimeoutException {
        this.objectMapper = objectMapper;

        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(config.rabbitHost());
        factory.setPort(config.rabbitPort());
        factory.setUsername(config.rabbitUser());
        factory.setPassword(config.rabbitPass());
        factory.setAutomaticRecoveryEnabled(true);

        this.connection = factory.newConnection("esportshub-agent");
        this.channel = openChannel();
    }

    public void publish(LiveSnapshotMessage message) throws IOException, InterruptedException, TimeoutException {
        if (channel == null || !channel.isOpen()) {
            channel = openChannel();
        }
        channel.basicPublish(EXCHANGE, ROUTING_KEY, PROPERTIES, objectMapper.writeValueAsBytes(message));
        channel.waitForConfirmsOrDie(CONFIRM_TIMEOUT_MS);
    }

    private Channel openChannel() throws IOException {
        Channel opened = connection.createChannel();
        opened.confirmSelect();
        return opened;
    }

    @Override
    public void close() {
        try {
            if (connection.isOpen()) {
                connection.close();
            }
        } catch (IOException e) {
            Log.error("zatvaranje veze nije uspjelo: " + e.getMessage());
        }
    }
}
