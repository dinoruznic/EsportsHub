package com.esportshub.backend.bracket;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class BracketStrategyResolver {

    private final Map<String, BracketStrategy> strategies;

    public BracketStrategyResolver(List<BracketStrategy> strategies) {
        this.strategies = strategies.stream()
                .collect(Collectors.toMap(BracketStrategy::format, Function.identity()));
    }

    public BracketStrategy resolve(String format) {
        BracketStrategy strategy = strategies.get(format);
        if (strategy == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nepodrzan format turnira");
        }
        return strategy;
    }
}
