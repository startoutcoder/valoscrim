package com.valoscrim.backend.team.service;

import com.valoscrim.backend.common.enums.AgentPosition;
import com.valoscrim.backend.common.enums.TeamRole;
import com.valoscrim.backend.team.*;
import com.valoscrim.backend.team.dto.MyTeamResponse;
import com.valoscrim.backend.team.dto.PublicTeamResponse;
import com.valoscrim.backend.team.dto.TeamCreateRequest;
import com.valoscrim.backend.team.dto.TeamResponse;
import com.valoscrim.backend.team.mapper.TeamMapper;
import com.valoscrim.backend.team.repository.TeamRepository;
import com.valoscrim.backend.user.User;
import com.valoscrim.backend.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TeamManagementService {

    private final TeamRepository teamRepository;
    private final UserService userService;
    private final TeamMapper teamMapper;

    public TeamResponse createTeam(TeamCreateRequest request, String username) {
        if (teamRepository.existsByName(request.name())) {
            throw new IllegalArgumentException("Team name already taken");
        }

        User owner = userService.getByUsername(username);

        Team team = Team.builder()
                .name(request.name())
                .tag(request.tag().toUpperCase())
                .wins(0)
                .losses(0)
                .ownerId(owner.getId())
                .build();

        TeamPreferences prefs = new TeamPreferences();
        prefs.setRequireMic(request.micAvailable());
        prefs.setCompetitiveness(request.competitiveness());
        prefs.setMinimumAge(request.minimumAge());
        team.setTeamPreferences(prefs);

        Team savedTeam = teamRepository.save(team);

        TeamMember ownerMember = TeamMember.builder()
                .team(savedTeam)
                .user(owner)
                .role(TeamRole.OWNER)
                .preferredPosition(AgentPosition.FLEX)
                .build();

        savedTeam.addMember(ownerMember);

        Team persistedTeam = teamRepository.findByIdWithMembersAndUsers(savedTeam.getId())
                .orElseThrow(() -> new RuntimeException("Team not found after creation"));

        return teamMapper.toTeamResponse(persistedTeam);
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamById(Long id) {
        Team team = teamRepository.findByIdWithMembersAndUsers(id)
                .orElseThrow(() -> new RuntimeException("Team not found with ID: " + id));

        return teamMapper.toTeamResponse(team);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> searchTeams(String nameQuery) {
        return teamRepository.findByNameContainingIgnoreCase(nameQuery)
                .stream()
                .map(teamMapper::toTeamResponse)
                .collect(Collectors.toList());
    }

    public void updateTeamName(Long teamId, String newName, String username) {
        Team team = getTeamOrThrow(teamId);
        User requester = userService.getByUsername(username);

        if (!team.getOwnerId().equals(requester.getId())) {
            throw new SecurityException("Only the team owner can update");
        }
        if (teamRepository.existsByName(newName)) {
            throw new SecurityException("Name already exists");
        }

        team.setName(newName);
        teamRepository.save(team);
    }

    public void deleteTeam(Long teamId, String username) {
        Team team = getTeamOrThrow(teamId);
        User requester = userService.getByUsername(username);

        if(!team.getOwnerId().equals(requester.getId())) {
            throw new SecurityException("Only the team owner can delete");
        }
        teamRepository.delete(team);
    }

    public List<MyTeamResponse> getMyTeams(String username) {
        User member = userService.getByUsername(username);
        return member.getMemberships().stream()
                .map(membership -> new MyTeamResponse(
                        membership.getTeam().getId(),
                        membership.getTeam().getName(),
                        membership.getTeam().getTag(),
                        membership.getRole().name(),
                        membership.getTeam().getMembers() != null ? membership.getTeam().getMembers().size() : 0
                ))
                .toList();
    }

    public Team getTeamOrThrow(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found with ID: " + id));
    }

    @Transactional(readOnly = true)
    public Page<PublicTeamResponse> getPublicTeams(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        return teamRepository.findPublicRecruitingTeams(pageable)
                .map(teamMapper::toPublicTeamResponse);
    }
}