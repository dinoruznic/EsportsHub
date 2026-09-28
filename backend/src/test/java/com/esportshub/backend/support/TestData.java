package com.esportshub.backend.support;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.game.GamePosition;
import com.esportshub.backend.game.GameRank;
import com.esportshub.backend.game.GameRegion;
import com.esportshub.backend.team.Team;
import com.esportshub.backend.user.Role;
import com.esportshub.backend.user.User;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;
import java.util.HashSet;
import java.util.function.Supplier;
import java.util.stream.Collectors;

public final class TestData {

    private TestData() {
    }

    public static Game game(Long id, String code, String rankType) {
        Game game = new Game();
        ReflectionTestUtils.setField(game, "id", id);
        ReflectionTestUtils.setField(game, "code", code);
        ReflectionTestUtils.setField(game, "name", code);
        ReflectionTestUtils.setField(game, "rankType", rankType);
        return game;
    }

    public static GameRegion region(Long id, Game game, String code) {
        return option(GameRegion::new, id, game, code);
    }

    public static GamePosition position(Long id, Game game, String code) {
        return option(GamePosition::new, id, game, code);
    }

    public static GameRank rank(Long id, Game game, String code) {
        GameRank rank = option(GameRank::new, id, game, code);
        ReflectionTestUtils.setField(rank, "ordinal", id.intValue());
        return rank;
    }

    public static User user(Long id, String username, String... roles) {
        return User.builder()
                .id(id)
                .username(username)
                .email(username + "@test.local")
                .passwordHash("x")
                .roles(Arrays.stream(roles)
                        .map(name -> Role.builder().name(name).build())
                        .collect(Collectors.toCollection(HashSet::new)))
                .build();
    }

    public static Team team(Long id, String name, Game game, User captain) {
        return Team.builder()
                .id(id)
                .name(name)
                .tag("T" + id)
                .game(game)
                .captain(captain)
                .build();
    }

    private static <T> T option(Supplier<T> factory, Long id, Game game, String code) {
        T option = factory.get();
        ReflectionTestUtils.setField(option, "id", id);
        ReflectionTestUtils.setField(option, "game", game);
        ReflectionTestUtils.setField(option, "code", code);
        ReflectionTestUtils.setField(option, "label", code);
        return option;
    }
}
