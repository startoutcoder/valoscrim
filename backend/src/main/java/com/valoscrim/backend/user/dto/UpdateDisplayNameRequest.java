package com.valoscrim.backend.user.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDisplayNameRequest(
        @NotBlank @Size(min = 3, max = 20) String newDisplayName
) {}