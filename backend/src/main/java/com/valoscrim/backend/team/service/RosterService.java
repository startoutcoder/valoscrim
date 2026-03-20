package com.valoscrim.backend.team.service;

import com.valoscrim.backend.common.enums.AgentPosition;
import com.valoscrim.backend.common.enums.TeamRole;
import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.team.TeamMember;
import com.valoscrim.backend.team.repository.TeamMemberRepository;
import com.valoscrim.backend.team.repository.TeamRepository;
import com.valoscrim.backend.team.dto.UpdateMemberRequest;
import com.valoscrim.backend.user.User;
import com.valoscrim.backend.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class RosterService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserService userService;
    private final TeamStatsService teamStatsService;

    public void addMember(Long teamId, String usernameToAdd, String requesterUsername) {
        Team team = getTeamOrThrow(teamId);
        User requester = userService.getByUsername(requesterUsername);

        if (!team.isOwner(requester)) {
            throw new SecurityException("Only the team owner can add members");
        }

        User newMemberUser = userService.getByUsername(usernameToAdd);

        if (teamMemberRepository.existsByTeamAndUser(team, newMemberUser)) {
            throw new IllegalArgumentException("User is already in the team");
        }

        saveTeamMember(team, newMemberUser, TeamRole.MEMBER);
    }

    public void kickMember(Long teamId, Long targetUserId, String username) {
        Team team = getTeamOrThrow(teamId);
        User requester = userService.getByUsername(username);

        if (!team.getOwnerId().equals(requester.getId())) {
            throw new SecurityException("Only the team owner can kick members");
        }

        User targetUser = userService.getByUserId(targetUserId);

        if (targetUser.getId().equals(requester.getId())) {
            throw new IllegalArgumentException("Owner cannot kick themselves");
        }

        TeamMember member = teamMemberRepository.findByTeamAndUser(team, targetUser)
                .orElseThrow(() -> new IllegalArgumentException("Target user is not a member of this team"));

        team.removeMember(member);
        teamStatsService.recalculateTeamStats(team);
    }

    public void leaveTeam(Long teamId, String username) {
        Team team = getTeamOrThrow(teamId);
        User requester = userService.getByUsername(username);

        if (!team.isMember(requester)) {
            throw new SecurityException("Only team members can leave");
        }

        if (team.isOwner(requester)) {
            throw new SecurityException("Owner cannot leave team");
        }

        TeamMember member = teamMemberRepository.findByTeamAndUser(team, requester)
                .orElseThrow(() -> new SecurityException("Team member not found"));

        team.removeMember(member);
        teamStatsService.recalculateTeamStats(team);
    }

    public void updateMemberRole(Long teamId, UpdateMemberRequest request, String ownerUsername, Long targetUserId) {
        Team team = getTeamOrThrow(teamId);
        User requester = userService.getByUsername(ownerUsername);

        if (!team.getOwnerId().equals(requester.getId())) {
            throw new SecurityException("Only the team owner can update roles");
        }

        User memberToUpdate = userService.getByUserId(targetUserId);
        TeamMember teamMember = teamMemberRepository.findByTeamAndUser(team, memberToUpdate)
                .orElseThrow(() -> new SecurityException("Update member role denied: not in team"));

        if (request.role() == TeamRole.OWNER && !memberToUpdate.getId().equals(team.getOwnerId())) {
            throw new IllegalArgumentException("Use a dedicated ownership-transfer flow to assign a new owner");
        }

        if (request.role() != null) {
            teamMember.setRole(request.role());
        }

        if (request.position() != null) {
            teamMember.setPreferredPosition(request.position());
        } else if (teamMember.getPreferredPosition() == null) {
            teamMember.setPreferredPosition(AgentPosition.FLEX);
        }

        teamMemberRepository.save(teamMember);
    }

    public void saveTeamMember(Team team, User user, TeamRole role) {
        TeamMember member = TeamMember.builder()
                .team(team)
                .user(user)
                .role(role)
                .preferredPosition(AgentPosition.FLEX)
                .build();

        team.addMember(member);
        teamStatsService.recalculateTeamStats(team);
    }

    private Team getTeamOrThrow(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found with ID: " + id));
    }
}