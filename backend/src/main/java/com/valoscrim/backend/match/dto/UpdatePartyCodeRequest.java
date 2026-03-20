package com.valoscrim.backend.match.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePartyCodeRequest(
        @NotBlank(message = "Party code is required")
        @Size(max = 50, message = "Party code must be 50 characters or fewer")
        String code
) {}