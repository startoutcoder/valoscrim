package com.valoscrim.backend.team.dto;
import java.time.LocalDate;

public record TeamReviewResponse(
        Long id,
        String reviewerName,
        String reviewerRank,
        boolean isRecommended,
        String comment,
        LocalDate date
) {}