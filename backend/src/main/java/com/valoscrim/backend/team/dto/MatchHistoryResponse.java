package com.valoscrim.backend.team.dto;
import java.time.LocalDate;

public record MatchHistoryResponse(
        Long id,
        String opponentName,
        String opponentTag,
        int opponentAvgTier,
        int myScore,
        int opponentScore,
        String result,
        String mapName,
        LocalDate date
) {}