package com.valoscrim.backend.match.dto;

import com.valoscrim.backend.common.enums.MatchStatus;
import com.valoscrim.backend.common.enums.MatchType;
import com.valoscrim.backend.common.enums.ServerRegion;

public record MatchFilterRequest(
        String strategy,
        MatchStatus status,
        MatchType matchType,
        ServerRegion serverLocation,
        String averageRank
) {}