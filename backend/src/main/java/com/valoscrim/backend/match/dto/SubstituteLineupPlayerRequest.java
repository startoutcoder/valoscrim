package com.valoscrim.backend.match.dto;

import jakarta.validation.constraints.NotNull;

public record SubstituteLineupPlayerRequest(
        @NotNull(message = "playerOutUserId is required")
        Long playerOutUserId,

        @NotNull(message = "playerInUserId is required")
        Long playerInUserId
) {}