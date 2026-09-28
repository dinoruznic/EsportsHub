package com.esportshub.backend.bracket;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Stream;

import static com.esportshub.backend.bracket.MatchStatus.CANCELLED;
import static com.esportshub.backend.bracket.MatchStatus.FINISHED;
import static com.esportshub.backend.bracket.MatchStatus.LIVE;
import static com.esportshub.backend.bracket.MatchStatus.SCHEDULED;
import static org.assertj.core.api.Assertions.assertThat;

class MatchStatusTest {

    private static final Set<String> ALLOWED = Set.of(
            "SCHEDULED->LIVE",
            "SCHEDULED->CANCELLED",
            "LIVE->FINISHED",
            "LIVE->CANCELLED");

    static Stream<Arguments> everyPairOfStatuses() {
        return Arrays.stream(MatchStatus.values())
                .flatMap(from -> Arrays.stream(MatchStatus.values())
                        .map(to -> Arguments.of(from, to, ALLOWED.contains(from + "->" + to))));
    }

    @ParameterizedTest(name = "{0} -> {1} dozvoljeno: {2}")
    @MethodSource("everyPairOfStatuses")
    void transitionMatrixMatchesDefinition(MatchStatus from, MatchStatus to, boolean allowed) {
        assertThat(from.canTransitionTo(to)).isEqualTo(allowed);
    }

    @Test
    void matrixCoversAllSixteenPairsWithExactlyFourAllowed() {
        assertThat(everyPairOfStatuses()).hasSize(16);
        assertThat(everyPairOfStatuses().filter(arguments -> (boolean) arguments.get()[2])).hasSize(4);
    }

    @Test
    void scheduledMatchCanStartOrBeCancelled() {
        assertThat(SCHEDULED.canTransitionTo(LIVE)).isTrue();
        assertThat(SCHEDULED.canTransitionTo(CANCELLED)).isTrue();
        assertThat(SCHEDULED.canTransitionTo(FINISHED)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = MatchStatus.class, names = {"FINISHED", "CANCELLED"})
    void terminalStatusesCannotMoveAnywhere(MatchStatus terminal) {
        assertThat(MatchStatus.values()).noneMatch(terminal::canTransitionTo);
    }

    @ParameterizedTest
    @EnumSource(MatchStatus.class)
    void noStatusTransitionsToItself(MatchStatus status) {
        assertThat(status.canTransitionTo(status)).isFalse();
    }
}
