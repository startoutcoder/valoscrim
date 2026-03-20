package com.valoscrim.backend.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateTeamNameRequest(
        @NotBlank(message = "Team name is required")
        @Size(min = 3, max = 30, message = "Team name must be between 3 and 30 characters")
        String name
) {}