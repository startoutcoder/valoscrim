package com.valoscrim.backend.team.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeamCreateRequest(
        @NotBlank(message = "Team name is required")
        @Size(min = 3, max = 30)
        String name,

        @NotBlank(message = "Team tag is required")
        @Size(min = 2, max = 5, message = "Tag must be between 2-5 characters")
        String tag,

        // New Fields
        boolean micAvailable,

        @Min(value = 13, message = "Minimum age must be at least 13")
        int minimumAge,

        @Min(value = 1, message = "Competitiveness scale starts at 1 (Chill)")
        @Max(value = 10, message = "Competitiveness scale ends at 10 (Tryhard)")
        int competitiveness
) {}