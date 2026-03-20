package com.valoscrim.backend.team.service;

import com.valoscrim.backend.common.enums.TeamRole;
import com.valoscrim.backend.team.*;
import com.valoscrim.backend.team.dto.TeamInviteResponse;
import com.valoscrim.backend.team.repository.TeamInviteRepository;
import com.valoscrim.backend.team.repository.TeamMemberRepository;
import com.valoscrim.backend.team.repository.TeamRepository;
import com.valoscrim.backend.user.User;
import com.valoscrim.backend.user.UserRepository;
import com.valoscrim.backend.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TeamInviteService {

    private final TeamInviteRepository teamInviteRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserService userService;
    private final UserRepository userRepository;
    private final RosterService rosterService;

    public void inviteUser(Long teamId, String targetUsername, String requesterUsername) {
        Team team = getTeamOrThrow(teamId);
        User inviter = userService.getByUsername(requesterUsername);

        TeamMember requesterMember = teamMemberRepository.findByTeamAndUser(team, inviter)
                .orElseThrow(() -> new SecurityException("You are not in this team"));

        if (requesterMember.getRole() == TeamRole.MEMBER) {
            throw new SecurityException("Only Captains and Owners can invite");
        }

        User targetUser = userService.getByUsername(targetUsername);

        if (team.isMember(targetUser)) {
            throw new IllegalArgumentException("User is already in the team");
        }

        if (team.isFull()) {
            throw new IllegalArgumentException("Team is already full");
        }

        if (teamInviteRepository.existsByTeamAndInvitee(team, targetUser)) {
            throw new IllegalArgumentException("Invite already pending");
        }

        TeamInvite invite = new TeamInvite();
        invite.setTeam(team);
        invite.setInvitee(targetUser);
        invite.setInviter(inviter);
        teamInviteRepository.save(invite);
    }

    public void respondToInvite(Long inviteId, boolean accept, String username) {
        TeamInvite invite = teamInviteRepository.findById(inviteId)
                .orElseThrow(() -> new RuntimeException("Invite not found"));

        if (!invite.getInvitee().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized to respond to this invite");
        }

        if (accept) {
            rosterService.saveTeamMember(invite.getTeam(), invite.getInvitee(), TeamRole.MEMBER);
        }

        teamInviteRepository.delete(invite);
    }

    public void requestJoin(Long teamId, String username) {
        Team team = getTeamOrThrow(teamId);
        User user = userService.getByUsername(username);

        if (team.isMember(user)) {
            throw new IllegalStateException("You are already a member of this team.");
        }

        if (team.isFull()) {
            throw new IllegalStateException("This team's roster is currently full.");
        }

        if (teamInviteRepository.existsByTeamAndInvitee(team, user)) {
            throw new IllegalStateException("You already have a pending request for this team.");
        }

        TeamInvite request = new TeamInvite();
        request.setTeam(team);
        request.setInvitee(user);
        request.setInviter(user);
        teamInviteRepository.save(request);
    }

    public List<TeamInviteResponse> getMyInvites(String username) {
        User user = userRepository.findByUsernameOrEmail(username, username).orElseThrow();

        return teamInviteRepository.findByInvitee(user).stream()
                .map(invite -> new TeamInviteResponse(
                        invite.getId(),
                        invite.getTeam().getName(),
                        invite.getTeam().getTag(),
                        invite.getInviter().getUsername()
                ))
                .toList();
    }

    private Team getTeamOrThrow(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found with ID: " + id));
    }


}