package com.valoscrim.backend.team.controller;

import com.valoscrim.backend.team.dto.*;
import com.valoscrim.backend.team.service.RosterService;
import com.valoscrim.backend.team.service.TeamInviteService;
import com.valoscrim.backend.team.service.TeamManagementService;
import com.valoscrim.backend.team.service.TeamReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamManagementService teamManagementService;
    private final RosterService rosterService;
    private final TeamInviteService teamInviteService;
    private final TeamReviewService teamReviewService;

    @PostMapping
    public ResponseEntity<TeamResponse> createTeam(
            @Valid @RequestBody TeamCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(teamManagementService.createTeam(request, userDetails.getUsername()));
    }

    @GetMapping("/{teamId}")
    public ResponseEntity<TeamResponse> getTeam(@PathVariable Long teamId) {
        return ResponseEntity.ok(teamManagementService.getTeamById(teamId));
    }

    @GetMapping("/public")
    public ResponseEntity<Page<PublicTeamResponse>> getPublicTeams(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(teamManagementService.getPublicTeams(page, size));
    }

    @GetMapping("/search")
    public ResponseEntity<List<TeamResponse>> searchTeams(@RequestParam String query) {
        return ResponseEntity.ok(teamManagementService.searchTeams(query));
    }

    @PatchMapping("/{teamId}")
    public ResponseEntity<Void> updateTeamName(
            @PathVariable Long teamId,
            @RequestParam(required = false) String name,
            @RequestBody(required = false) UpdateTeamNameRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String resolvedName = request != null && request.name() != null ? request.name() : name;

        if (resolvedName == null || resolvedName.isBlank()) {
            throw new IllegalArgumentException("Team name is required");
        }

        teamManagementService.updateTeamName(teamId, resolvedName, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{teamId}")
    public ResponseEntity<Void> deleteTeam(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        teamManagementService.deleteTeam(teamId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{teamId}/members")
    public ResponseEntity<Void> addMember(
            @PathVariable Long teamId,
            @RequestParam String username,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        rosterService.addMember(teamId, username, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @RequestMapping(
            value = "/{teamId}/members/{userId}",
            method = {RequestMethod.PUT, RequestMethod.PATCH}
    )
    public ResponseEntity<Void> updateMember(
            @PathVariable Long teamId,
            @PathVariable Long userId,
            @RequestBody UpdateMemberRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        rosterService.updateMemberRole(teamId, request, userDetails.getUsername(), userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{teamId}/join-request")
    public ResponseEntity<Void> requestJoin(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        teamInviteService.requestJoin(teamId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{teamId}/members/me")
    public ResponseEntity<Void> leaveTeam(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        rosterService.leaveTeam(teamId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{teamId}/members/{userId}")
    public ResponseEntity<Void> kickMember(
            @PathVariable Long teamId,
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        rosterService.kickMember(teamId, userId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{teamId}/invites")
    public ResponseEntity<Void> inviteUser(
            @PathVariable Long teamId,
            @RequestParam(required = false) String username,
            @RequestBody(required = false) InviteUserRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String resolvedUsername = request != null && request.username() != null ? request.username() : username;

        if (resolvedUsername == null || resolvedUsername.isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }

        teamInviteService.inviteUser(teamId, resolvedUsername, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{teamId}/reviews")
    public ResponseEntity<List<TeamReviewResponse>> getReviews(@PathVariable Long teamId) {
        return ResponseEntity.ok(teamReviewService.getTeamReviews(teamId));
    }

    @PostMapping("/{teamId}/reviews")
    public ResponseEntity<Void> addReview(
            @PathVariable Long teamId,
            @RequestBody CreateReviewRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        teamReviewService.addReview(teamId, request, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{teamId}/matches")
    public ResponseEntity<List<MatchHistoryResponse>> getMatchHistory(@PathVariable Long teamId) {
        return ResponseEntity.ok(teamReviewService.getMatchHistory(teamId));
    }
}