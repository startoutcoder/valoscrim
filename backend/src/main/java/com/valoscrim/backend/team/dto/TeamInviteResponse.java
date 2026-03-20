package com.valoscrim.backend.team.dto;

public record TeamInviteResponse(
        Long id,
        String teamName,
        String teamTag,
        String inviterName
) {}