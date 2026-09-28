package com.esportshub.agent;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public final class Log {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm:ss");

    private Log() {
    }

    public static void info(String message) {
        System.out.println("[" + LocalTime.now().format(TIME) + "] " + message);
    }

    public static void error(String message) {
        System.err.println("[" + LocalTime.now().format(TIME) + "] GRESKA: " + message);
    }
}
