package com.esportshub.backend.game;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final GameRepository gameRepository;
    private final GameRegionRepository gameRegionRepository;
    private final GamePositionRepository gamePositionRepository;
    private final GameRankRepository gameRankRepository;

    @GetMapping("")
    public List<GameResponse> list() {
        return gameRepository.findAll().stream()
                .map(GameResponse::from)
                .toList();
    }

    @GetMapping("/{id}/regions")
    public List<OptionResponse> regions(@PathVariable Long id) {
        return gameRegionRepository.findByGame_IdOrderByLabel(id).stream()
                .map(OptionResponse::from)
                .toList();
    }

    @GetMapping("/{id}/positions")
    public List<OptionResponse> positions(@PathVariable Long id) {
        return gamePositionRepository.findByGame_IdOrderByLabel(id).stream()
                .map(OptionResponse::from)
                .toList();
    }

    @GetMapping("/{id}/ranks")
    public List<OptionResponse> ranks(@PathVariable Long id) {
        return gameRankRepository.findByGame_IdOrderByOrdinal(id).stream()
                .map(OptionResponse::from)
                .toList();
    }
}
