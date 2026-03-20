package com.valoscrim.backend.team.dto;

public record MyTeamResponse(
        Long id,
        String name,
        String tag,
        String role,
        int memberCount
) {}