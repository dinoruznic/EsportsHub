package com.esportshub.backend.bracket;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static com.esportshub.backend.support.ApiAssertions.assertStatus;
import static org.assertj.core.api.Assertions.assertThat;

class BracketStrategyResolverTest {

    private final SingleEliminationStrategy singleElimination = new SingleEliminationStrategy();
    private final BracketStrategyResolver resolver = new BracketStrategyResolver(List.of(singleElimination));

    @Test
    void knownFormatResolvesToItsStrategy() {
        assertThat(resolver.resolve("SINGLE_ELIMINATION")).isSameAs(singleElimination);
    }

    @Test
    void unknownFormatIsBadRequest() {
        assertStatus(() -> resolver.resolve("DOUBLE_ELIMINATION"), HttpStatus.BAD_REQUEST, "nepodrzan format");
    }
}
