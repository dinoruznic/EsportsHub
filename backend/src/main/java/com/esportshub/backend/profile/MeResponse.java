package com.esportshub.backend.profile;

import com.esportshub.backend.user.Role;
import com.esportshub.backend.user.User;

import java.time.Instant;
import java.util.List;

public record MeResponse(
        Long id,
        String username,
        String email,
        String displayName,
        List<String> roles,
        Instant createdAt
) {
    public static MeResponse from(User user) {
        return new MeResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRoles().stream().map(Role::getName).sorted().toList(),
                user.getCreatedAt());
    }
}
