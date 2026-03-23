package com.valoscrim.backend.match.service;

import com.valoscrim.backend.common.enums.LineupSlotStatus;
import com.valoscrim.backend.common.enums.MatchSide;
import com.valoscrim.backend.common.enums.MatchStatus;
import com.valoscrim.backend.common.enums.MatchType;
import com.valoscrim.backend.common.enums.ParticipantType;
import com.valoscrim.backend.common.enums.TeamRole;
import com.valoscrim.backend.match.MatchRepository;
import com.valoscrim.backend.match.ScrimMatch;
import com.valoscrim.backend.match.ScrimMatchPlayer;
import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.team.TeamMember;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MatchLineupService {

    private final MatchRepository matchRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public void initializeLineupForTeam(ScrimMatch match, Team team, MatchSide side) {
        if (match == null || team == null || side == null) {
            return;
        }

        boolean alreadyExists = match.getPlayers().stream()
                .anyMatch(p -> p.getParticipantType() == ParticipantType.TEAM_ROSTER && p.getMatchSide() == side);

        if (alreadyExists) {
            return;
        }

        List<TeamMember> roster = team.getMembers().stream()
                .sorted(Comparator
                        .comparing((TeamMember m) -> m.getJoinedAt(), Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(m -> m.getUser().getId()))
                .toList();

        for (int i = 0; i < roster.size(); i++) {
            TeamMember teamMember = roster.get(i);

            ScrimMatchPlayer matchPlayer = ScrimMatchPlayer.builder()
                    .match(match)
                    .user(teamMember.getUser())
                    .team(team)
                    .participantType(ParticipantType.TEAM_ROSTER)
                    .matchSide(side)
                    .lineupSlotStatus(i < 5 ? LineupSlotStatus.STARTER : LineupSlotStatus.BENCH)
                    .isReady(false)
                    .build();

            match.addPlayer(matchPlayer);
        }
    }

    public void setStarters(Long matchId, String username, List<Long> starterUserIds) {
        ScrimMatch match = matchRepository.findByIdForUpdate(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getMatchType() != MatchType.TEAM) {
            throw new IllegalArgumentException("Lineups are only available for team matches");
        }

        if (match.getStatus() == MatchStatus.IN_PROGRESS
                || match.getStatus() == MatchStatus.COMPLETED
                || match.getStatus() == MatchStatus.CANCELLED) {
            throw new IllegalStateException("Lineup changes are not allowed at this match state");
        }

        Team managedTeam = resolveManagedTeam(match, username);

        if (starterUserIds == null || starterUserIds.size() != 5) {
            throw new IllegalArgumentException("Exactly 5 starters must be selected");
        }

        Set<Long> uniqueStarterIds = new HashSet<>(starterUserIds);
        if (uniqueStarterIds.size() != 5) {
            throw new IllegalArgumentException("Starter list contains duplicates");
        }

        List<ScrimMatchPlayer> teamParticipants = getTeamParticipants(match, managedTeam);

        Set<Long> allowedUserIds = teamParticipants.stream()
                .map(p -> p.getUser().getId())
                .collect(Collectors.toSet());

        if (!allowedUserIds.containsAll(uniqueStarterIds)) {
            throw new IllegalArgumentException("All selected starters must belong to your team's match roster");
        }

        for (ScrimMatchPlayer player : teamParticipants) {
            if (uniqueStarterIds.contains(player.getUser().getId())) {
                player.setLineupSlotStatus(LineupSlotStatus.STARTER);
            } else {
                player.setLineupSlotStatus(LineupSlotStatus.BENCH);
            }
        }

        resetTeamReady(match, managedTeam);
        matchRepository.save(match);
        messagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    public void substitutePlayer(Long matchId, String username, Long playerOutUserId, Long playerInUserId) {
        ScrimMatch match = matchRepository.findByIdForUpdate(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getMatchType() != MatchType.TEAM) {
            throw new IllegalArgumentException("Substitutions are only available for team matches");
        }

        if (match.getStatus() == MatchStatus.COMPLETED || match.getStatus() == MatchStatus.CANCELLED) {
            throw new IllegalStateException("Substitutions are not allowed at this match state");
        }

        Team managedTeam = resolveManagedTeam(match, username);
        List<ScrimMatchPlayer> teamParticipants = getTeamParticipants(match, managedTeam);

        ScrimMatchPlayer playerOut = teamParticipants.stream()
                .filter(p -> p.getUser().getId().equals(playerOutUserId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Outgoing player is not in your team's match roster"));

        ScrimMatchPlayer playerIn = teamParticipants.stream()
                .filter(p -> p.getUser().getId().equals(playerInUserId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Incoming player is not in your team's match roster"));

        if (playerOut.getLineupSlotStatus() != LineupSlotStatus.STARTER) {
            throw new IllegalArgumentException("Outgoing player must currently be a starter");
        }

        if (playerIn.getLineupSlotStatus() != LineupSlotStatus.BENCH) {
            throw new IllegalArgumentException("Incoming player must currently be on the bench");
        }

        playerOut.setLineupSlotStatus(LineupSlotStatus.BENCH);
        playerIn.setLineupSlotStatus(LineupSlotStatus.STARTER);

        resetTeamReady(match, managedTeam);
        matchRepository.save(match);
        messagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    private Team resolveManagedTeam(ScrimMatch match, String username) {
        if (canManageLineup(match.getTeamHome(), username)) {
            return match.getTeamHome();
        }

        if (canManageLineup(match.getTeamAway(), username)) {
            return match.getTeamAway();
        }

        throw new SecurityException("Only the team owner or captain can manage lineups");
    }

    private boolean canManageLineup(Team team, String username) {
        if (team == null || username == null) {
            return false;
        }

        return team.getMembers().stream().anyMatch(member ->
                member.getUser() != null
                        && username.equals(member.getUser().getUsername())
                        && (member.getRole() == TeamRole.OWNER || member.getRole() == TeamRole.CAPTAIN)
        );
    }

    private List<ScrimMatchPlayer> getTeamParticipants(ScrimMatch match, Team team) {
        return match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.TEAM_ROSTER)
                .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(team.getId()))
                .toList();
    }

    private void resetTeamReady(ScrimMatch match, Team team) {
        if (match.getTeamHome() != null && match.getTeamHome().getId().equals(team.getId())) {
            match.setHomeTeamReady(false);
        } else if (match.getTeamAway() != null && match.getTeamAway().getId().equals(team.getId())) {
            match.setAwayTeamReady(false);
        }
    }
}