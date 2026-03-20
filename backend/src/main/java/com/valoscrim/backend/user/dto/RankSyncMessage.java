package com.valoscrim.backend.user.dto;

public record RankSyncMessage(Long userId, String riotId, String tagLine) {}