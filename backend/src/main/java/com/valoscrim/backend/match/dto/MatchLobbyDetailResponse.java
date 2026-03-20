package com.valoscrim.backend.match.dto;

import com.valoscrim.backend.common.enums.ServerRegion;

import java.util.List;

public record MatchLobbyDetailResponse(
        Long id,
        String matchType,
        String status,
        String mapName,
        String partyCode,
        String mapSelectionMode,
        ServerRegion serverLocation,

        List<LobbyPlayer> players,

        LobbyTeam teamHome,
        LobbyTeam teamAway
) {
    public record LobbyPlayer(
            Long id,
            String username,
            String riotGameName,
            boolean ready,
            String currentRank,
            String teamRole
    ) {}

    public record LobbyTeam(
            Long id,
            String name,
            String tag,
            boolean ready,
            List<LobbyPlayer> members,
            List<LobbyPlayer> starters,
            List<LobbyPlayer> bench
    ) {}
}