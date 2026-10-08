package com.esportshub.backend.match;

import com.esportshub.backend.user.User;

public record RefereeResponse(
        String username,
        String displayName
) {
    public static RefereeResponse from(User user) {
        return new RefereeResponse(user.getUsername(), user.getDisplayName());
    }
}
