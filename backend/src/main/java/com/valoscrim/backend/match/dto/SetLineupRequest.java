package com.valoscrim.backend.match.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SetLineupRequest(
        @NotNull(message = "starterUserIds is required")
        @Size(min = 5, max = 5, message = "Exactly 5 starters are required")
        List<@NotNull Long> starterUserIds
) {}