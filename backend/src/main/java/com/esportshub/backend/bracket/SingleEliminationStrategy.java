package com.esportshub.backend.bracket;

import com.esportshub.backend.team.Team;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class SingleEliminationStrategy implements BracketStrategy {

    @Override
    public String format() {
        return "SINGLE_ELIMINATION";
    }

    @Override
    public void generate(BracketBuilder builder, List<Team> seededTeams) {
        int n = seededTeams.size();
        List<Integer> seedOrder = seedOrder(n);
        int roundCount = Integer.numberOfTrailingZeros(n);

        BracketBuilder.RoundRef firstRound = builder.round(1, roundName(1, n / 2));
        List<BracketBuilder.MatchRef> previous = new ArrayList<>();
        for (int k = 0; k < n / 2; k++) {
            Team teamA = seededTeams.get(seedOrder.get(2 * k) - 1);
            Team teamB = seededTeams.get(seedOrder.get(2 * k + 1) - 1);
            previous.add(builder.match(firstRound, teamA, teamB));
        }

        for (int r = 2; r <= roundCount; r++) {
            int matchCount = n >> r;
            BracketBuilder.RoundRef round = builder.round(r, roundName(r, matchCount));
            List<BracketBuilder.MatchRef> current = new ArrayList<>();
            for (int j = 0; j < matchCount; j++) {
                BracketBuilder.MatchRef match = builder.match(round, null, null);
                builder.advances(previous.get(2 * j), match);
                builder.advances(previous.get(2 * j + 1), match);
                current.add(match);
            }
            previous = current;
        }
    }

    private static List<Integer> seedOrder(int n) {
        List<Integer> order = List.of(1);
        for (int m = 1; m < n; m *= 2) {
            List<Integer> next = new ArrayList<>();
            for (int seed : order) {
                next.add(seed);
                next.add(2 * m + 1 - seed);
            }
            order = next;
        }
        return order;
    }

    private static String roundName(int roundNumber, int matchCount) {
        return switch (matchCount) {
            case 1 -> "Finale";
            case 2 -> "Polufinale";
            case 4 -> "Cetvrtfinale";
            default -> "Runda " + roundNumber;
        };
    }
}
