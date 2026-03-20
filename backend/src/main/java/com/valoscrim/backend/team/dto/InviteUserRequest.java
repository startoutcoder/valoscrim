package com.valoscrim.backend.team.dto;

import jakarta.validation.constraints.NotBlank;

public record InviteUserRequest(
        @NotBlank(message = "Username is required")
        String username
) {}