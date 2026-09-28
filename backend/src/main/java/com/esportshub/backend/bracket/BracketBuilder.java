package com.esportshub.backend.bracket;

import com.esportshub.backend.team.Team;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class BracketBuilder {

    public record RoundRef(int index) {
    }

    public record MatchRef(int index) {
    }

    public record RoundSpec(int roundNumber, String name) {
    }

    public record MatchSpec(RoundRef round, Team teamA, Team teamB) {
    }

    public record Link(MatchRef from, MatchRef to) {
    }

    private final List<RoundSpec> rounds = new ArrayList<>();
    private final List<MatchSpec> matches = new ArrayList<>();
    private final List<Link> links = new ArrayList<>();

    public RoundRef round(int roundNumber, String name) {
        rounds.add(new RoundSpec(roundNumber, name));
        return new RoundRef(rounds.size() - 1);
    }

    public MatchRef match(RoundRef round, Team teamA, Team teamB) {
        matches.add(new MatchSpec(round, teamA, teamB));
        return new MatchRef(matches.size() - 1);
    }

    public void advances(MatchRef from, MatchRef to) {
        links.add(new Link(from, to));
    }

    public List<RoundSpec> rounds() {
        return Collections.unmodifiableList(rounds);
    }

    public List<MatchSpec> matches() {
        return Collections.unmodifiableList(matches);
    }

    public List<Link> links() {
        return Collections.unmodifiableList(links);
    }
}
