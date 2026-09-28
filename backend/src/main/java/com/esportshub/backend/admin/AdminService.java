package com.esportshub.backend.admin;

import com.esportshub.backend.user.Role;
import com.esportshub.backend.user.RoleRepository;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public List<String> grantRole(String username, RoleGrantRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Korisnik ne postoji"));

        Role role = roleRepository.findByName(request.role().trim().toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "nepostojeca uloga"));

        if (user.getRoles().stream().noneMatch(existing -> existing.getId().equals(role.getId()))) {
            user.getRoles().add(role);
            userRepository.save(user);
        }

        return user.getRoles().stream()
                .map(Role::getName)
                .sorted()
                .toList();
    }
}
