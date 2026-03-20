package com.valoscrim.backend.team.dto;

import java.time.LocalDate;
import java.util.List;

public record TeamResponse(
        Long id,
        String name,
        String tag,
        int wins,
        int losses,
        Long ownerId,
        LocalDate createdAt,
        Integer averageMmr,
        String averageRank,
        Boolean micAvailable,
        Integer minimumAge,
        Integer competitiveness,
        List<TeamMemberResponse> members
) {}