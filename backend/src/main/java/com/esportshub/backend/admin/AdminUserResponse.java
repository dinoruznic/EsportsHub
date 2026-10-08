package com.esportshub.backend.admin;

import com.esportshub.backend.user.Role;
import com.esportshub.backend.user.User;

import java.time.Instant;
import java.util.List;

public record AdminUserResponse(
        Long id,
        String username,
        String displayName,
        String email,
        List<String> roles,
        Instant createdAt
) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmail(),
                user.getRoles().stream().map(Role::getName).sorted().toList(),
                user.getCreatedAt());
    }
}
