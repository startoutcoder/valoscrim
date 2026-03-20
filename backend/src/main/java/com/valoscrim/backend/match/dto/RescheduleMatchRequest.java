package com.valoscrim.backend.match.dto;

import java.time.LocalDateTime;

public record RescheduleMatchRequest(LocalDateTime newTime) {}