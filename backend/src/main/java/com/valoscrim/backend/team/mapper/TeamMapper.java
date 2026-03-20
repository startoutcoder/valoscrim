package com.valoscrim.backend.team.mapper;

import com.valoscrim.backend.common.enums.AgentPosition;
import com.valoscrim.backend.common.util.RankUtil;
import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.team.TeamPreferences;
import com.valoscrim.backend.team.dto.PublicTeamResponse;
import com.valoscrim.backend.team.dto.TeamMemberResponse;
import com.valoscrim.backend.team.dto.TeamResponse;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class TeamMapper {

    public TeamResponse toTeamResponse(Team team) {
        TeamPreferences prefs = team.getTeamPreferences();

        Boolean micAvailable = prefs != null ? prefs.isRequireMic() : null;
        Integer minimumAge = prefs != null ? prefs.getMinimumAge() : null;
        Integer competitiveness = prefs != null ? prefs.getCompetitiveness() : null;

        if (team.getMembers() == null) {
            return new TeamResponse(
                    team.getId(),
                    team.getName(),
                    team.getTag(),
                    team.getWins(),
                    team.getLosses(),
                    team.getOwnerId(),
                    team.getCreatedAt().toLocalDate(),
                    team.getAverageMmr(),
                    RankUtil.rankFromMmr(team.getAverageMmr()),
                    micAvailable,
                    minimumAge,
                    competitiveness,
                    List.of()
            );
        }

        List<TeamMemberResponse> memberResponses = team.getMembers().stream()
                .map(m -> new TeamMemberResponse(
                        m.getUser().getId(),
                        m.getUser().getUsername(),
                        m.getUser().getDisplayName(),
                        m.getUser().getRiotGameName(),
                        m.getUser().getCurrentRank(),
                        m.getRole(),
                        m.getPreferredPosition() != null
                                ? m.getPreferredPosition()
                                : AgentPosition.FLEX
                ))
                .toList();

        return new TeamResponse(
                team.getId(),
                team.getName(),
                team.getTag(),
                team.getWins(),
                team.getLosses(),
                team.getOwnerId(),
                team.getCreatedAt().toLocalDate(),
                team.getAverageMmr(),
                RankUtil.rankFromMmr(team.getAverageMmr()),
                micAvailable,
                minimumAge,
                competitiveness,
                memberResponses
        );
    }

    public PublicTeamResponse toPublicTeamResponse(Team team) {
        int memberCount = team.getMemberCount() != null
                ? team.getMemberCount()
                : (team.getMembers() != null ? team.getMembers().size() : 0);

        TeamPreferences prefs = team.getTeamPreferences();

        boolean micAvailable = prefs != null && prefs.isRequireMic();
        int minimumAge = prefs != null ? prefs.getMinimumAge() : 0;

        return new PublicTeamResponse(
                team.getId(),
                team.getName(),
                team.getTag(),
                memberCount,
                memberCount < 7,
                RankUtil.rankFromMmr(team.getAverageMmr()),
                micAvailable,
                minimumAge
        );
    }
}