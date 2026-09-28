package com.esportshub.backend.gameaccount;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.game.GamePositionRepository;
import com.esportshub.backend.game.GameRankRepository;
import com.esportshub.backend.game.GameRegionRepository;
import com.esportshub.backend.game.GameRepository;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class GameAccountService {

    private final GameAccountRepository gameAccountRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final GameRegionRepository gameRegionRepository;
    private final GamePositionRepository gamePositionRepository;
    private final GameRankRepository gameRankRepository;

    public GameAccountResponse create(String username, CreateGameAccountRequest request) {
        User owner = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Korisnik nije prijavljen"));

        Game game = gameRepository.findById(request.gameId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown game"));

        if (gameAccountRepository.existsByUser_UsernameAndGame_Id(username, request.gameId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "already have an account for this game");
        }

        GameAccount account = GameAccount.builder()
                .user(owner)
                .game(game)
                .inGameName(request.inGameName().trim())
                .marketStatus(MarketStatus.INACTIVE)
                .build();

        applyAttributes(account, request.regionId(), request.positionId(), request.rankId(), request.rating());

        return GameAccountResponse.from(gameAccountRepository.save(account));
    }

    @Transactional(readOnly = true)
    public List<GameAccountResponse> listMine(String username) {
        return gameAccountRepository.findByUser_Username(username).stream()
                .map(GameAccountResponse::from)
                .toList();
    }

    public GameAccountResponse update(String username, Long id, UpdateGameAccountRequest request) {
        GameAccount account = gameAccountRepository.findByIdAndUser_Username(id, username)
                .orElseThrow(GameAccountService::notFound);

        applyAttributes(account, request.regionId(), request.positionId(), request.rankId(), request.rating());

        account.setInGameName(request.inGameName().trim());
        account.setMarketStatus(request.marketStatus());

        return GameAccountResponse.from(gameAccountRepository.save(account));
    }

    public void delete(String username, Long id) {
        GameAccount account = gameAccountRepository.findByIdAndUser_Username(id, username)
                .orElseThrow(GameAccountService::notFound);

        gameAccountRepository.delete(account);
    }

    @Transactional(readOnly = true)
    public List<GameAccountResponse> listByUsername(String username) {
        if (!userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Korisnik ne postoji");
        }

        return gameAccountRepository.findByUser_Username(username).stream()
                .map(GameAccountResponse::from)
                .toList();
    }

    private void applyAttributes(GameAccount account, Long regionId, Long positionId, Long rankId, Integer rating) {
        Game game = account.getGame();
        Long gameId = game.getId();

        account.setRegion(regionId == null ? null : gameRegionRepository.findByIdAndGame_Id(regionId, gameId)
                .orElseThrow(() -> badRequest("regija ne pripada igri")));

        account.setPosition(positionId == null ? null : gamePositionRepository.findByIdAndGame_Id(positionId, gameId)
                .orElseThrow(() -> badRequest("pozicija ne pripada igri")));

        switch (game.getRankType()) {
            case "TIER" -> {
                if (rating != null) {
                    throw badRequest("ova igra koristi rank, ne rating");
                }
                account.setRank(rankId == null ? null : gameRankRepository.findByIdAndGame_Id(rankId, gameId)
                        .orElseThrow(() -> badRequest("rank ne pripada igri")));
                account.setRating(null);
            }
            case "NUMERIC" -> {
                if (rankId != null) {
                    throw badRequest("ova igra koristi rating, ne rank");
                }
                account.setRank(null);
                account.setRating(rating);
            }
            default -> {
                if (rankId != null || rating != null) {
                    throw badRequest("ova igra nema rank");
                }
                account.setRank(null);
                account.setRating(null);
            }
        }
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Nalog ne postoji");
    }
}
