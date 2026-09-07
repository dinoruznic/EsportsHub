package com.esportshub.backend.auth;

import java.util.Set;

public record AuthResponse(
        String token,
        String tokenType,
        Long userId,
        String username,
        Set<String> roles
) {
    public static AuthResponse bearer(String token, Long userId, String username, Set<String> roles) {
        return new AuthResponse(token, "Bearer", userId, username, roles);
    }
}
