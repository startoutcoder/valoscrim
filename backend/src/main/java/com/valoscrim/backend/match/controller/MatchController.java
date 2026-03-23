package com.valoscrim.backend.match.controller;

import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import lombok.extern.slf4j.Slf4j;
import com.valoscrim.backend.common.enums.ServerRegion;
import com.valoscrim.backend.match.dto.*;
import com.valoscrim.backend.match.service.MatchLineupService;
import com.valoscrim.backend.match.service.MatchLobbyService;
import com.valoscrim.backend.match.service.MatchManagementService;
import com.valoscrim.backend.match.service.MatchSearchService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchManagementService matchManagementService;
    private final MatchSearchService matchSearchService;
    private final MatchLobbyService matchLobbyService;
    private final MatchLineupService matchLineupService;

    @PostMapping
    @Operation(summary = "Create match", description = "Creates a new match resource")
    public ResponseEntity<MatchResponse> createLobby(
            @RequestBody CreateLobbyRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(
                matchManagementService.createLobby(request, userDetails.getUsername())
        );
    }

    @PostMapping("/solo")
    public ResponseEntity<MatchResponse> createSoloLobby(
            @RequestParam(required = false, defaultValue = "VETO") String mapSelectionMode,
            @RequestParam(required = false) ServerRegion serverLocation,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(
                matchManagementService.createSoloLobby(userDetails.getUsername(), mapSelectionMode, serverLocation)
        );
    }

    @GetMapping
    public ResponseEntity<List<MatchResponse>> getMatches(
            @RequestParam(required = false, defaultValue = "ALL") String strategy,
            @RequestParam(required = false) com.valoscrim.backend.common.enums.MatchStatus status,
            @RequestParam(required = false) com.valoscrim.backend.common.enums.MatchType matchType,
            @RequestParam(required = false) ServerRegion serverLocation,
            @RequestParam(required = false) String averageRank,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        MatchFilterRequest filter = new MatchFilterRequest(
                strategy,
                status,
                matchType,
                serverLocation,
                averageRank
        );

        return ResponseEntity.ok(
                matchSearchService.findMatches(filter, userDetails.getUsername())
        );
    }

    /**
     * Deprecated alias kept for backward compatibility.
     */
    @Deprecated
    @GetMapping("/open")
    public ResponseEntity<List<MatchResponse>> getOpenLobbies() {
        return ResponseEntity.ok(matchSearchService.getOpenLobbies());
    }

    @GetMapping("/{matchId}")
    public ResponseEntity<MatchLobbyDetailResponse> getLobby(@PathVariable Long matchId) {
        return ResponseEntity.ok(matchLobbyService.getLobbyDetails(matchId));
    }

    @PostMapping("/{matchId}/join")
    public ResponseEntity<Void> joinLobby(
            @PathVariable Long matchId,
            @RequestParam(required = false) Long teamId,
            @RequestBody(required = false) JoinLobbyRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long resolvedTeamId = request != null && request.teamId() != null ? request.teamId() : teamId;

        if (resolvedTeamId == null) {
            throw new IllegalArgumentException("teamId is required");
        }

        matchManagementService.joinLobby(matchId, resolvedTeamId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{matchId}/join-solo")
    public ResponseEntity<Void> joinSoloLobby(
            @PathVariable Long matchId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        matchManagementService.joinSoloLobby(matchId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{matchId}/ready")
    public ResponseEntity<Void> readyUp(
            @PathVariable Long matchId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        matchLobbyService.toggleReady(matchId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{matchId}/ready-state")
    public ResponseEntity<Void> setReadyState(
            @PathVariable Long matchId,
            @RequestBody UpdateReadyStateRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        if (request == null || request.ready() == null) {
            throw new IllegalArgumentException("ready is required");
        }

        matchLobbyService.setReadyState(matchId, userDetails.getUsername(), request.ready());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{matchId}/schedule")
    public ResponseEntity<Void> rescheduleMatch(
            @PathVariable Long matchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime newTime,
            @RequestBody(required = false) RescheduleMatchRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        LocalDateTime resolvedTime = request != null && request.newTime() != null ? request.newTime() : newTime;

        if (resolvedTime == null) {
            throw new IllegalArgumentException("newTime is required");
        }

        matchManagementService.rescheduleMatch(matchId, resolvedTime, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{matchId}/party-code")
    public ResponseEntity<Void> updatePartyCode(
            @PathVariable Long matchId,
            @RequestParam(required = false) String code,
            @RequestBody(required = false) UpdatePartyCodeRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String resolvedCode = request != null && request.code() != null ? request.code() : code;

        if (resolvedCode == null || resolvedCode.isBlank()) {
            throw new IllegalArgumentException("Party code is required");
        }

        matchManagementService.updatePartyCode(matchId, resolvedCode, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{matchId}/map")
    public ResponseEntity<Void> updateMap(
            @PathVariable Long matchId,
            @Valid @RequestBody UpdateMapRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        matchManagementService.updateMap(matchId, request.mapName(), userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{matchId}")
    public ResponseEntity<Void> deleteLobby(
            @PathVariable Long matchId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        matchManagementService.deleteLobby(matchId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{matchId}/cancel")
    public ResponseEntity<Void> cancelLobby(
            @PathVariable Long matchId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        matchManagementService.deleteLobby(matchId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{matchId}/participants/me")
    public ResponseEntity<Void> leaveMatchRestful(
            @PathVariable Long matchId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        matchLobbyService.leaveMatch(matchId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{matchId}/leave")
    public ResponseEntity<Void> leaveMatch(
            @PathVariable Long matchId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        matchLobbyService.leaveMatch(matchId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{matchId}/lineup")
    public ResponseEntity<Void> setLineup(
            @PathVariable Long matchId,
            @Valid @RequestBody SetLineupRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        matchLineupService.setStarters(matchId, userDetails.getUsername(), request.starterUserIds());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{matchId}/lineup/substitute")
    public ResponseEntity<Void> substituteLineupPlayer(
            @PathVariable Long matchId,
            @Valid @RequestBody SubstituteLineupPlayerRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        matchLineupService.substitutePlayer(
                matchId,
                userDetails.getUsername(),
                request.playerOutUserId(),
                request.playerInUserId()
        );
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{matchId}/server-region")
    public ResponseEntity<Void> updateServerRegion(
            @PathVariable Long matchId,
            @Valid @RequestBody UpdateServerRegionRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        matchManagementService.updateServerRegion(
                matchId,
                request.serverLocation(),
                userDetails.getUsername()
        );
        return ResponseEntity.ok().build();
    }

    @MessageExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public String handleException(ObjectOptimisticLockingFailureException ex) {
        log.warn("Blocked a concurrent veto request (Double click or network lag detected).");
        return "Another player has already made a veto request. Your screen will synchronize accordingly.";
    }
}