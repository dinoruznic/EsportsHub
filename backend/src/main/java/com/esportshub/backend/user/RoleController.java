package com.esportshub.backend.user;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Demonstrira cijeli lanac: Liquibase seed -> tabela roles -> Role entitet
 * -> RoleRepository -> ovaj controller -> JSON.
 * GET http://localhost:8080/api/roles
 */
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleRepository roleRepository;

    @GetMapping
    public List<String> allRoleNames() {
        return roleRepository.findAll().stream()
                .map(Role::getName)
                .toList();
    }
}
