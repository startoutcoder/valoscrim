package com.valoscrim.backend.team.service;

import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class TeamStatsService {

    private final TeamRepository teamRepository;

    public void recalculateTeamStats(Team team) {
        if (team == null) {
            return;
        }

        team.setMemberCount(team.getMembers() == null ? 0 : team.getMembers().size());

        if (team.getMembers() == null || team.getMembers().isEmpty()) {
            team.setAverageMmr(0);
            team.setAverageTierId(0);
            teamRepository.save(team);
            return;
        }

        double average = team.getMembers().stream()
                .filter(member -> member.getUser() != null)
                .filter(member -> member.getUser().getMmrElo() != null)
                .filter(member -> member.getUser().getMmrElo() > 0)
                .mapToInt(member -> member.getUser().getMmrElo())
                .average()
                .orElse(0.0);

        int averageMmr = (int) Math.round(average);

        team.setAverageMmr(averageMmr);
        team.setAverageTierId(averageMmr);
        teamRepository.save(team);
    }
}