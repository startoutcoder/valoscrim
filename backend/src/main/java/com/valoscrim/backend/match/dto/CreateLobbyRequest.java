package com.valoscrim.backend.match.dto;

import com.valoscrim.backend.common.enums.MatchType;
import com.valoscrim.backend.common.enums.ServerRegion;

import java.time.LocalDateTime;

public record CreateLobbyRequest(
        MatchType matchType,
        Long teamId,
        LocalDateTime startTime,
        String mapSelectionMode,
        ServerRegion serverLocation
) {}