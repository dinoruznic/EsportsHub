package com.esportshub.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * PRIVREMENA sigurnosna konfiguracija.
 * Sve je trenutno dozvoljeno da mozemo razvijati i testirati endpointe.
 * TODO (Faza 1 - auth): zamijeniti pravim RBAC-om -> login, JWT filter, role
 *                       (SPECTATOR / PLAYER / CAPTAIN / REFEREE / ADMIN).
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin())); // za H2 konzolu
        return http.build();
    }
}
