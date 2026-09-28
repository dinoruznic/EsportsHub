package com.esportshub.backend.bracket;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.support.TestData;
import com.esportshub.backend.team.Team;
import com.esportshub.backend.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class SingleEliminationStrategyTest {

    private final SingleEliminationStrategy strategy = new SingleEliminationStrategy();

    @Test
    void formatIsSingleElimination() {
        assertThat(strategy.format()).isEqualTo("SINGLE_ELIMINATION");
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 4, 8, 16})
    void createsLogTwoRoundsWithHalvingMatchCounts(int n) {
        BracketBuilder builder = generate(n);

        int expectedRounds = Integer.numberOfTrailingZeros(n);
        assertThat(builder.rounds()).hasSize(expectedRounds);
        assertThat(builder.rounds()).extracting(BracketBuilder.RoundSpec::roundNumber)
                .containsExactlyElementsOf(IntStream.rangeClosed(1, expectedRounds).boxed().toList());

        Map<Integer, Long> matchesPerRound = builder.matches().stream()
                .collect(Collectors.groupingBy(spec -> spec.round().index(), Collectors.counting()));
        for (int r = 0; r < expectedRounds; r++) {
            assertThat(matchesPerRound.get(r)).as("mecevi u rundi %d", r + 1).isEqualTo((long) (n >> (r + 1)));
        }
        assertThat(builder.matches()).hasSize(n - 1);
    }

    @Test
    void fourTeamsArePairedOneVersusFourAndTwoVersusThree() {
        assertThat(firstRoundSeeds(generate(4))).containsExactly(List.of(1, 4), List.of(2, 3));
    }

    @Test
    void eightTeamsFollowStandardSeeding() {
        assertThat(firstRoundSeeds(generate(8)))
                .containsExactly(List.of(1, 8), List.of(4, 5), List.of(2, 7), List.of(3, 6));
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 4, 8, 16})
    void everySeedPlaysOnceInFirstRoundAgainstMirrorSeed(int n) {
        List<List<Integer>> pairs = firstRoundSeeds(generate(n));

        assertThat(pairs.stream().flatMap(List::stream))
                .containsExactlyInAnyOrderElementsOf(IntStream.rangeClosed(1, n).boxed().toList());
        assertThat(pairs).allSatisfy(pair -> assertThat(pair.get(0) + pair.get(1)).isEqualTo(n + 1));
    }

    @ParameterizedTest
    @ValueSource(ints = {4, 8, 16})
    void laterRoundsStartWithEmptySlots(int n) {
        BracketBuilder builder = generate(n);

        assertThat(builder.matches()).filteredOn(spec -> spec.round().index() > 0)
                .allSatisfy(spec -> {
                    assertThat(spec.teamA()).isNull();
                    assertThat(spec.teamB()).isNull();
                });
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 4, 8, 16})
    void everyNonFinalMatchAdvancesToExactlyOneMatchOfNextRound(int n) {
        BracketBuilder builder = generate(n);
        int finalIndex = builder.matches().size() - 1;

        Map<Integer, Long> outgoing = builder.links().stream()
                .collect(Collectors.groupingBy(link -> link.from().index(), Collectors.counting()));

        for (int i = 0; i < finalIndex; i++) {
            assertThat(outgoing.get(i)).as("izlazi iz meca %d", i).isEqualTo(1L);
        }
        assertThat(outgoing).doesNotContainKey(finalIndex);

        assertThat(builder.links()).allSatisfy(link -> {
            int fromRound = builder.matches().get(link.from().index()).round().index();
            int toRound = builder.matches().get(link.to().index()).round().index();
            assertThat(toRound).isEqualTo(fromRound + 1);
        });
    }

    @ParameterizedTest
    @ValueSource(ints = {4, 8, 16})
    void everyLaterRoundMatchHasExactlyTwoFeeders(int n) {
        BracketBuilder builder = generate(n);

        Map<Integer, Long> incoming = builder.links().stream()
                .collect(Collectors.groupingBy(link -> link.to().index(), Collectors.counting()));

        IntStream.range(0, builder.matches().size())
                .filter(i -> builder.matches().get(i).round().index() > 0)
                .forEach(i -> assertThat(incoming.get(i)).as("ulazi u mec %d", i).isEqualTo(2L));
    }

    @Test
    void roundNamesDependOnMatchCount() {
        assertThat(roundNames(2)).containsExactly("Finale");
        assertThat(roundNames(4)).containsExactly("Polufinale", "Finale");
        assertThat(roundNames(8)).containsExactly("Cetvrtfinale", "Polufinale", "Finale");
        assertThat(roundNames(16)).containsExactly("Runda 1", "Cetvrtfinale", "Polufinale", "Finale");
    }

    private BracketBuilder generate(int n) {
        BracketBuilder builder = new BracketBuilder();
        strategy.generate(builder, seededTeams(n));
        return builder;
    }

    private List<String> roundNames(int n) {
        return generate(n).rounds().stream().map(BracketBuilder.RoundSpec::name).toList();
    }

    private static List<List<Integer>> firstRoundSeeds(BracketBuilder builder) {
        Function<Team, Integer> seed = team -> team.getId().intValue();
        return builder.matches().stream()
                .filter(spec -> spec.round().index() == 0)
                .map(spec -> List.of(seed.apply(spec.teamA()), seed.apply(spec.teamB())))
                .toList();
    }

    private static List<Team> seededTeams(int n) {
        Game game = TestData.game(1L, "LOL", "TIER");
        User captain = TestData.user(1L, "kapiten");
        return IntStream.rangeClosed(1, n)
                .mapToObj(seed -> TestData.team((long) seed, "Seed " + seed, game, captain))
                .toList();
    }
}
