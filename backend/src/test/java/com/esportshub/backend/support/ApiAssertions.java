package com.esportshub.backend.support;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public final class ApiAssertions {

    private ApiAssertions() {
    }

    public static void assertStatus(ThrowingCallable call, HttpStatus status) {
        assertStatus(call, status, "");
    }

    public static void assertStatus(ThrowingCallable call, HttpStatus status, String reason) {
        assertThatThrownBy(call)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> {
                    ResponseStatusException exception = (ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(status);
                    assertThat(exception.getReason()).contains(reason);
                });
    }
}
