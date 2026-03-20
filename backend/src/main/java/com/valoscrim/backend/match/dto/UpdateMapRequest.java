package com.valoscrim.backend.match.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateMapRequest(
        @NotBlank(message = "Map name is required")
        String mapName
) {}