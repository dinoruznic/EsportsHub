package com.esportshub.backend.config;

import com.esportshub.backend.user.Role;
import com.esportshub.backend.user.RoleRepository;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final String ADMIN_ROLE = "ADMIN";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username}")
    private String adminUsername;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.existsByRoles_Name(ADMIN_ROLE)) {
            return;
        }

        Role adminRole = roleRepository.findByName(ADMIN_ROLE)
                .orElseThrow(() -> new IllegalStateException("Uloga " + ADMIN_ROLE + " ne postoji u bazi"));

        User admin = User.builder()
                .username(adminUsername)
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .displayName("Administrator")
                .roles(new HashSet<>(Set.of(adminRole)))
                .build();

        userRepository.save(admin);
    }
}
