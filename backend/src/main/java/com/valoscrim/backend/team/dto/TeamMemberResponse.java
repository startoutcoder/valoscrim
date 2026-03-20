package com.valoscrim.backend.team.dto;

import com.valoscrim.backend.common.enums.AgentPosition;
import com.valoscrim.backend.common.enums.TeamRole;

public record TeamMemberResponse(
        Long userId,
        String username,
        String displayName,
        String riotGameName,
        String currentRank,
        TeamRole role,
        AgentPosition position
) {}
