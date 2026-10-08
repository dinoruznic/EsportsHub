package com.esportshub.agent;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public record AgentConfig(
        String matchKey,
        boolean mock,
        int intervalSeconds,
        int startSeconds,
        Side sideA,
        String rabbitHost,
        int rabbitPort,
        String rabbitUser,
        String rabbitPass
) {

    public static final String USAGE = """
            Upotreba: java -jar esportshub-agent.jar --match-key=<kljuc> [opcije]

              --match-key=<kljuc>     kljuc meca (GET /api/matches/{id}/agent-key)   env: AGENT_MATCH_KEY
              --mock                  generisani podaci, bez League klijenta         env: AGENT_MOCK=true
              --interval=5            sekunde izmedju snapshota                     env: AGENT_INTERVAL
              --start=MM:SS           pocetno vrijeme igre, samo uz --mock          env: AGENT_START
              --side-a=ORDER|CHAOS    koja strana u igri je nas tim A                env: AGENT_SIDE_A
              --rabbit-host=localhost                                                env: AGENT_RABBIT_HOST
              --rabbit-port=5672                                                     env: AGENT_RABBIT_PORT
              --rabbit-user=agent                                                    env: AGENT_RABBIT_USER
              --rabbit-pass=agent123                                                 env: AGENT_RABBIT_PASS

            Demo (mec krece od 14:00, novi podatak svake 2 sekunde):
              java -jar esportshub-agent.jar --mock --start=14:00 --interval=2 --match-key=<kljuc>
            """;

    private static final Pattern START = Pattern.compile("(\\d{1,3}):([0-5]\\d)");

    private static final Set<String> OPTIONS = Set.of(
            "match-key", "mock", "interval", "start", "side-a", "rabbit-host", "rabbit-port", "rabbit-user", "rabbit-pass");

    public static AgentConfig parse(String[] args, Map<String, String> env) {
        Map<String, String> options = new HashMap<>();
        for (String arg : args) {
            if (!arg.startsWith("--")) {
                throw new IllegalArgumentException("nepoznat argument: " + arg);
            }
            String body = arg.substring(2);
            int eq = body.indexOf('=');
            String name = eq < 0 ? body : body.substring(0, eq);
            String value = eq < 0 ? "true" : body.substring(eq + 1);
            if (!OPTIONS.contains(name)) {
                throw new IllegalArgumentException("nepoznata opcija: --" + name);
            }
            options.put(name, value);
        }

        String matchKey = value(options, env, "match-key", "AGENT_MATCH_KEY", null);
        if (matchKey == null || matchKey.isBlank()) {
            throw new IllegalArgumentException("nedostaje --match-key");
        }

        boolean mock = Boolean.parseBoolean(value(options, env, "mock", "AGENT_MOCK", "false"));
        int startSeconds = start(value(options, env, "start", "AGENT_START", "0:00"));
        if (startSeconds > 0 && !mock) {
            throw new IllegalArgumentException("--start radi samo uz --mock");
        }

        return new AgentConfig(
                matchKey.trim(),
                mock,
                positive(value(options, env, "interval", "AGENT_INTERVAL", "5"), "--interval"),
                startSeconds,
                side(value(options, env, "side-a", "AGENT_SIDE_A", "ORDER")),
                value(options, env, "rabbit-host", "AGENT_RABBIT_HOST", "localhost"),
                positive(value(options, env, "rabbit-port", "AGENT_RABBIT_PORT", "5672"), "--rabbit-port"),
                value(options, env, "rabbit-user", "AGENT_RABBIT_USER", "agent"),
                value(options, env, "rabbit-pass", "AGENT_RABBIT_PASS", "agent123"));
    }

    private static String value(Map<String, String> options, Map<String, String> env,
                                String option, String envName, String fallback) {
        if (options.containsKey(option)) {
            return options.get(option);
        }
        String fromEnv = env.get(envName);
        return fromEnv != null && !fromEnv.isBlank() ? fromEnv : fallback;
    }

    private static int positive(String raw, String option) {
        try {
            int number = Integer.parseInt(raw.trim());
            if (number <= 0) {
                throw new IllegalArgumentException(option + " mora biti pozitivan broj");
            }
            return number;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(option + " mora biti broj: " + raw);
        }
    }

    private static int start(String raw) {
        Matcher matcher = START.matcher(raw.trim());
        if (!matcher.matches()) {
            throw new IllegalArgumentException("--start mora biti u obliku MM:SS, npr. 14:00: " + raw);
        }
        return Integer.parseInt(matcher.group(1)) * 60 + Integer.parseInt(matcher.group(2));
    }

    private static Side side(String raw) {
        try {
            return Side.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("--side-a mora biti ORDER ili CHAOS: " + raw);
        }
    }
}
