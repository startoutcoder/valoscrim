package com.valoscrim.backend.user.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateProfilePictureRequest(
        @NotBlank(message = "imageUrl is required")
        String imageUrl
) {}