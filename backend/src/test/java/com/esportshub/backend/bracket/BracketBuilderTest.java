package com.esportshub.backend.bracket;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BracketBuilderTest {

    @Test
    void handlesPointToPositionsInInsertionOrder() {
        BracketBuilder builder = new BracketBuilder();

        BracketBuilder.RoundRef first = builder.round(1, "Polufinale");
        BracketBuilder.RoundRef second = builder.round(2, "Finale");
        BracketBuilder.MatchRef a = builder.match(first, null, null);
        BracketBuilder.MatchRef b = builder.match(first, null, null);
        BracketBuilder.MatchRef finalMatch = builder.match(second, null, null);
        builder.advances(a, finalMatch);
        builder.advances(b, finalMatch);

        assertThat(first.index()).isZero();
        assertThat(second.index()).isEqualTo(1);
        assertThat(finalMatch.index()).isEqualTo(2);
        assertThat(builder.matches().get(finalMatch.index()).round()).isEqualTo(second);
        assertThat(builder.links()).containsExactly(
                new BracketBuilder.Link(a, finalMatch),
                new BracketBuilder.Link(b, finalMatch));
    }

    @Test
    void exposedPlanCannotBeModifiedFromOutside() {
        BracketBuilder builder = new BracketBuilder();
        builder.round(1, "Finale");

        assertThatThrownBy(() -> builder.rounds().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> builder.matches().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> builder.links().clear()).isInstanceOf(UnsupportedOperationException.class);
    }
}
