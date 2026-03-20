package com.valoscrim.backend.user.dto;

import jakarta.validation.constraints.NotBlank;

public record LinkRiotAccountRequest(
        @NotBlank(message = "Riot ID is required") String riotId,
        @NotBlank(message = "Tagline is required") String tagLine
) {}