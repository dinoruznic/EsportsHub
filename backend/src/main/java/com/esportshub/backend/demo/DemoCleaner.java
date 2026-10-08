package com.esportshub.backend.demo;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "esportshub.demo.enabled", havingValue = "true")
public class DemoCleaner {

    private static final List<String> STATEMENTS = List.of(
            "delete from notifications",
            "delete from result_confirmations",
            "delete from live_game_snapshots",
            "delete from match_events",
            "update matches set next_match_id = null",
            "delete from matches",
            "delete from rounds",
            "delete from tournament_registrations",
            "delete from tournaments",
            "delete from contracts",
            "delete from transfer_offers",
            "delete from transfer_listings",
            "delete from team_memberships",
            "delete from teams",
            "delete from game_accounts");

    private final JdbcTemplate jdbcTemplate;

    @Value("${app.admin.username}")
    private String adminUsername;

    @Transactional(propagation = Propagation.MANDATORY)
    public void clean() {
        STATEMENTS.forEach(jdbcTemplate::update);
        jdbcTemplate.update("delete from user_roles where user_id in (select id from users where username <> ?)", adminUsername);
        jdbcTemplate.update("delete from users where username <> ?", adminUsername);
    }
}
