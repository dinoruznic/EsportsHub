package com.esportshub.backend.bracket;

import com.esportshub.backend.team.Team;

import java.util.List;

public interface BracketStrategy {
    String format();
    void generate(BracketBuilder builder, List<Team> seededTeams);
}
