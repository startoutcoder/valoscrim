package com.valoscrim.backend.match.mapper;

import com.valoscrim.backend.common.enums.MatchType;
import com.valoscrim.backend.common.enums.ParticipantType;
import com.valoscrim.backend.match.ScrimMatch;
import com.valoscrim.backend.match.dto.MatchResponse;
import org.springframework.stereotype.Component;

@Component
public class MatchMapper {

    private static final int SOLO_MAX_PLAYERS = 10;

    public MatchResponse toMatchResponse(ScrimMatch match) {
        Integer primaryAvgElo = null;
        Integer playerCount = null;
        Integer maxPlayers = null;

        if (match.getMatchType() == MatchType.SOLO) {
            primaryAvgElo = match.getAverageMmr();
            playerCount = countSoloPlayers(match);
            maxPlayers = SOLO_MAX_PLAYERS;
        } else if (match.getMatchType() == MatchType.TEAM) {
            primaryAvgElo = match.getAverageMmr();
        }

        return new MatchResponse(
                match.getId(),
                match.getMatchType(),

                match.getTeamHome() != null ? match.getTeamHome().getId() : null,
                match.getTeamHome() != null ? match.getTeamHome().getName() : null,
                primaryAvgElo,

                match.getTeamAway() != null ? match.getTeamAway().getId() : null,
                match.getTeamAway() != null ? match.getTeamAway().getName() : null,
                match.getTeamAway() != null ? match.getTeamAway().getAverageMmr() : null,

                playerCount,
                maxPlayers,

                match.getScheduledTime(),
                match.getStatus(),
                match.getServerLocation()
        );
    }

    private Integer countSoloPlayers(ScrimMatch match) {
        return (int) match.getPlayers().stream()
                .filter(player -> player.getParticipantType() == ParticipantType.SOLO)
                .count();
    }
}