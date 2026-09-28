package com.esportshub.agent;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AgentConfigTest {

    @Test
    void usesDefaults() {
        AgentConfig config = AgentConfig.parse(new String[]{"--match-key=abc"}, Map.of());

        assertEquals("abc", config.matchKey());
        assertFalse(config.mock());
        assertEquals(5, config.intervalSeconds());
        assertEquals(Side.ORDER, config.sideA());
        assertEquals("localhost", config.rabbitHost());
        assertEquals(5672, config.rabbitPort());
        assertEquals("agent", config.rabbitUser());
    }

    @Test
    void argumentsOverrideEnvironment() {
        AgentConfig config = AgentConfig.parse(
                new String[]{"--mock", "--interval=2", "--side-a=chaos", "--rabbit-pass=tajna"},
                Map.of("AGENT_MATCH_KEY", "iz-env", "AGENT_INTERVAL", "9", "AGENT_RABBIT_HOST", "rabbit"));

        assertEquals("iz-env", config.matchKey());
        assertTrue(config.mock());
        assertEquals(2, config.intervalSeconds());
        assertEquals(Side.CHAOS, config.sideA());
        assertEquals("rabbit", config.rabbitHost());
        assertEquals("tajna", config.rabbitPass());
    }

    @Test
    void rejectsMissingKeyAndBadValues() {
        assertThrows(IllegalArgumentException.class, () -> AgentConfig.parse(new String[]{}, Map.of()));
        assertThrows(IllegalArgumentException.class,
                () -> AgentConfig.parse(new String[]{"--match-key=a", "--interval=0"}, Map.of()));
        assertThrows(IllegalArgumentException.class,
                () -> AgentConfig.parse(new String[]{"--match-key=a", "--side-a=BLUE"}, Map.of()));
        assertThrows(IllegalArgumentException.class,
                () -> AgentConfig.parse(new String[]{"--match-key=a", "--nepoznato"}, Map.of()));
    }
}
