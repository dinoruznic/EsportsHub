package com.esportshub.backend.match;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public record MatchActor(
        String username,
        boolean admin
) {
    public static MatchActor from(UserDetails principal) {
        boolean isAdmin = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
        return new MatchActor(principal.getUsername(), isAdmin);
    }
}
