package com.valoscrim.backend.match.dto;

import com.valoscrim.backend.common.enums.ServerRegion;
import jakarta.validation.constraints.NotNull;

public record UpdateServerRegionRequest(
        @NotNull(message = "serverLocation is required")
        ServerRegion serverLocation
) {}