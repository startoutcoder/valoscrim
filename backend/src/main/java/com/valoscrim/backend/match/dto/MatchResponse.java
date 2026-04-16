package com.valoscrim.backend.match.dto;

import com.valoscrim.backend.common.enums.MatchStatus;
import com.valoscrim.backend.common.enums.MatchType;
import com.valoscrim.backend.common.enums.ServerRegion;

import java.time.LocalDateTime;

public record MatchResponse(
        Long id,
        MatchType matchType,

        Long homeTeamId,
        String homeTeamName,
        Integer homeTeamAverageMmr,

        Long awayTeamId,
        String awayTeamName,
        Integer awayTeamAverageMmr,

        Integer playerCount,
        Integer maxPlayers,

        LocalDateTime scheduledTime,
        MatchStatus status,
        ServerRegion serverLocation,

        boolean isParticipating
) {}