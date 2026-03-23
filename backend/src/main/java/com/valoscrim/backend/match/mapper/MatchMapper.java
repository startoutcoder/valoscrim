package com.valoscrim.backend.match.mapper;

import com.valoscrim.backend.common.enums.MatchSide;
import com.valoscrim.backend.common.enums.MatchType;
import com.valoscrim.backend.common.enums.ParticipantType;
import com.valoscrim.backend.match.ScrimMatch;
import com.valoscrim.backend.match.dto.MatchResponse;
import org.springframework.stereotype.Component;

@Component
public class MatchMapper {

    private static final int SOLO_MAX_PLAYERS = 10;


    public MatchResponse toMatchResponse(ScrimMatch match) {
        Integer homeTeamAverageMmr = null;
        Integer awayTeamAverageMmr = null;
        Integer playerCount = null;
        Integer maxPlayers = null;

        if (match.getMatchType() == MatchType.SOLO) {
            homeTeamAverageMmr = calculateMatchAverageMmr(match, MatchType.SOLO, null);
            playerCount = countSoloPlayers(match);
            maxPlayers = SOLO_MAX_PLAYERS;
        } else if (match.getMatchType() == MatchType.TEAM) {
            homeTeamAverageMmr = calculateMatchAverageMmr(match, MatchType.TEAM, MatchSide.HOME);
            awayTeamAverageMmr = calculateMatchAverageMmr(match, MatchType.TEAM, MatchSide.AWAY);
        }

        return new MatchResponse(
                match.getId(),
                match.getMatchType(),
                match.getTeamHome() != null ? match.getTeamHome().getId() : null,
                match.getTeamHome() != null ? match.getTeamHome().getName() : null,
                homeTeamAverageMmr,
                match.getTeamAway() != null ? match.getTeamAway().getId() : null,
                match.getTeamAway() != null ? match.getTeamAway().getName() : null,
                awayTeamAverageMmr,
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

    private Integer calculateMatchAverageMmr(ScrimMatch match, MatchType type, MatchSide side) {
        if (match.getPlayers() == null || match.getPlayers().isEmpty()) return null;

        double avg = 0.0;
        if (type == MatchType.SOLO) {
            avg = match.getPlayers().stream()
                    .filter(p -> p.getParticipantType() == ParticipantType.SOLO)
                    .filter(p -> p.getUser() != null && p.getUser().getMmrElo() != null)
                    .mapToInt(p -> p.getUser().getMmrElo())
                    .average()
                    .orElse(0.0);
        } else if (type == MatchType.TEAM) {
            avg = match.getPlayers().stream()
                    .filter(p -> p.getParticipantType() == ParticipantType.TEAM_ROSTER)
                    .filter(p -> p.getMatchSide() == side)
                    .filter(p -> p.getLineupSlotStatus() == com.valoscrim.backend.common.enums.LineupSlotStatus.STARTER)
                    .filter(p -> p.getUser() != null && p.getUser().getMmrElo() != null)
                    .mapToInt(p -> p.getUser().getMmrElo())
                    .average()
                    .orElse(0.0);
        }
        return avg > 0 ? (int) Math.round(avg) : null;
    }


}