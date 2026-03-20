package com.valoscrim.backend.team.dto;

import com.valoscrim.backend.common.enums.TeamRole;
import com.valoscrim.backend.common.enums.AgentPosition;

public record UpdateMemberRequest(TeamRole role, AgentPosition position) {}