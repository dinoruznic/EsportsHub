package com.esportshub.backend.market;

import java.time.Instant;
import java.time.LocalDate;

public record ContractResponse(
        Long id,
        Long gameAccountId,
        String inGameName,
        Long teamId,
        String teamName,
        Integer salary,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        Instant createdAt
) {
    public static ContractResponse from(Contract contract) {
        return new ContractResponse(
                contract.getId(),
                contract.getGameAccount().getId(),
                contract.getGameAccount().getInGameName(),
                contract.getTeam().getId(),
                contract.getTeam().getName(),
                contract.getSalary(),
                contract.getStartDate(),
                contract.getEndDate(),
                contract.getStatus().name(),
                contract.getCreatedAt());
    }
}
