package com.valoscrim.backend.user.dto;
import java.util.List;

public record UserProfileResponse(
        Long id,
        String username,
        String displayName,
        String email,
        String profilePicture,
        String riotGameName,
        String riotTagLine,
        List<TeamSummary> teams
) {
    public record TeamSummary (
            Long id,
            String name,
            String tag
    ) {}
}