package com.esportshub.backend.game;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final GameRepository gameRepository;

    @GetMapping("")
    public List<GameResponse> list() {
        return gameRepository.findAll().stream()
                .map(GameResponse::from)
                .toList();
    }
}
