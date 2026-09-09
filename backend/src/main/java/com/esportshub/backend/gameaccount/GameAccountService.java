package com.esportshub.backend.gameaccount;

import com.esportshub.backend.game.Game;
import com.esportshub.backend.game.GameRepository;
import com.esportshub.backend.user.User;
import com.esportshub.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class GameAccountService {

    private static final Set<Rank> APEX_RANKS = Set.of(
            Rank.MASTER,
            Rank.GRANDMASTER,
            Rank.CHALLENGER);

    private final GameAccountRepository gameAccountRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;

    public GameAccountResponse create(String username, CreateGameAccountRequest request) {
        User owner = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Korisnik nije prijavljen"));

        Game game = gameRepository.findById(request.gameId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown game"));

        if (gameAccountRepository.existsByUser_UsernameAndGame_Id(username, request.gameId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "already have an account for this game");
        }

        validateDivision(request.rank(), request.division());

        GameAccount account = GameAccount.builder()
                .user(owner)
                .game(game)
                .inGameName(request.inGameName().trim())
                .region(request.region())
                .rank(request.rank())
                .position(request.position())
                .division(request.division())
                .marketStatus(MarketStatus.INACTIVE)
                .build();

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

        validateDivision(request.rank(), request.division());

        account.setInGameName(request.inGameName().trim());
        account.setRegion(request.region());
        account.setRank(request.rank());
        account.setPosition(request.position());
        account.setDivision(request.division());
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

    private static void validateDivision(Rank rank, Division division) {
        if (rank != null && division != null && APEX_RANKS.contains(rank)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "apex tier has no division");
        }
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Nalog ne postoji");
    }
}
