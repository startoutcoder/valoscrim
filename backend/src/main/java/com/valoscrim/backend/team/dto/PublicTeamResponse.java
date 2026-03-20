package com.valoscrim.backend.team.dto;

public record PublicTeamResponse(
        Long id,
        String name,
        String tag,
        int memberCount,
        boolean recruiting,
        String averageRank,
        boolean micAvailable,
        int minimumAge
) {}