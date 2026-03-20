package com.valoscrim.backend.user.controller;

import com.valoscrim.backend.team.dto.MyTeamResponse;
import com.valoscrim.backend.team.dto.TeamInviteResponse;
import com.valoscrim.backend.user.service.UserService;
import com.valoscrim.backend.user.dto.*;
import com.valoscrim.backend.team.service.TeamManagementService;
import com.valoscrim.backend.team.service.TeamInviteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final TeamManagementService teamManagementService;
    private final TeamInviteService teamInviteService;

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMyAccount(@AuthenticationPrincipal UserDetails userDetails) {
        userService.deleteUserAccount(userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getUsername()));
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserProfileResponse> getProfile(@PathVariable String username) {
        return ResponseEntity.ok(userService.getUserProfile(username));
    }

    @GetMapping("/me/teams")
    public ResponseEntity<List<MyTeamResponse>> getMyTeams(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(teamManagementService.getMyTeams(userDetails.getUsername()));
    }

    @GetMapping("/me/team-invites")
    public ResponseEntity<List<TeamInviteResponse>> getMyInvites(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(teamInviteService.getMyInvites(userDetails.getUsername()));
    }

    @PostMapping("/me/team-invites/{inviteId}/respond")
    public ResponseEntity<Void> respondToInvite(
            @PathVariable Long inviteId,
            @RequestParam(required = false) Boolean accept,
            @RequestBody(required = false) RespondInviteRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Boolean resolvedAccept = request != null && request.accept() != null ? request.accept() : accept;

        if (resolvedAccept == null) {
            throw new IllegalArgumentException("accept is required");
        }

        teamInviteService.respondToInvite(inviteId, resolvedAccept, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/me/riot-account")
    public ResponseEntity<UserProfileResponse> linkRiotAccount(
            @Valid @RequestBody LinkRiotAccountRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(userService.linkRiotAccount(userDetails.getUsername(), request.riotId(), request.tagLine()));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody UpdatePasswordRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        userService.changePassword(userDetails.getUsername(), request.currentPassword(), request.newPassword());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/me/display-name")
    public ResponseEntity<UserProfileResponse> changeDisplayName(
            @Valid @RequestBody UpdateDisplayNameRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(userService.changeDisplayName(userDetails.getUsername(), request.newDisplayName()));
    }

    @PutMapping("/me/profile-picture")
    public ResponseEntity<Void> updateProfilePicture(
            @Valid @RequestBody UpdateProfilePictureRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        userService.updateProfilePicture(request.imageUrl(), userDetails.getUsername());
        return ResponseEntity.ok().build();
    }
}