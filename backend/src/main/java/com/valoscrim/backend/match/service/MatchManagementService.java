package com.valoscrim.backend.match.service;

import com.valoscrim.backend.common.enums.*;
import com.valoscrim.backend.match.mapper.MatchMapper;
import com.valoscrim.backend.match.MatchRepository;
import com.valoscrim.backend.match.ScrimMatch;
import com.valoscrim.backend.match.ScrimMatchPlayer;
import com.valoscrim.backend.match.dto.CreateLobbyRequest;
import com.valoscrim.backend.match.dto.MatchResponse;
import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.team.service.TeamManagementService;
import com.valoscrim.backend.user.User;
import com.valoscrim.backend.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MatchManagementService {

    private final MatchRepository matchRepository;
    private final UserService userService;
    private final TeamManagementService teamManagementService;
    private final MatchMapper matchMapper;
    private final MatchSearchService matchSearchService;
    private final MatchLineupService matchLineupService;
    private final SimpMessagingTemplate simpMessagingTemplate;
    private final MatchVetoService matchVetoService;

    @Transactional
    public void deleteLobby(Long matchId, String username) {
        ScrimMatch match = matchSearchService.getMatchOrThrow(matchId);

        log.info("DELETE REQUEST: Match {} | User: {}", matchId, username);

        if (match.getMatchType() == MatchType.TEAM) {
            User user = userService.getByUsername(username);
            if (match.getTeamHome() == null || !match.getTeamHome().isOwner(user)) {
                log.warn("BLOCKED: User is not the Home Team owner.");
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the Home Team owner can delete this match");
            }
        } else {
            boolean isInLobby = match.getPlayers().stream()
                    .anyMatch(p -> p.getParticipantType() == ParticipantType.SOLO
                            && p.getUser().getUsername().equals(username));

            if (!isInLobby) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not in this lobby");
            }
        }

        matchRepository.delete(match);
        matchVetoService.cleanupMatch(matchId);
        simpMessagingTemplate.convertAndSend("/topic/match-" + matchId, "DELETED");
    }

    @Transactional
    public void updatePartyCode(Long matchId, String code, String username) {
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Party code is required");
        }

        ScrimMatch match = matchSearchService.getMatchOrThrow(matchId);
        assertCanModifyMatchDetails(match, username);

        match.setPartyCode(code);
        matchRepository.save(match);
        simpMessagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    public MatchResponse createLobby(CreateLobbyRequest request, String username) {
        User user = userService.getByUsername(username);
        Team homeTeam = teamManagementService.getTeamOrThrow(request.teamId());

        log.debug("Lobby creation - user ID : {} | Team owner ID : {}", user.getId(), homeTeam.getId());

        if (!homeTeam.isOwner(user)) {
            throw new SecurityException("Only the team owner can create a lobby");
        }

        validateTeamCanEnterTeamMatch(homeTeam);

        ScrimMatch match = ScrimMatch.builder()
                .matchType(MatchType.TEAM)
                .teamHome(homeTeam)
                .scheduledTime(request.startTime())
                .status(MatchStatus.OPEN)
                .mapSelectionMode(request.mapSelectionMode() != null ? request.mapSelectionMode() : "VETO")
                .serverLocation(request.serverLocation() != null ? request.serverLocation() : ServerRegion.SEOUL)
                .build();

        ScrimMatch savedMatch = matchRepository.save(match);

        matchLineupService.initializeLineupForTeam(savedMatch, homeTeam, MatchSide.HOME);

        ScrimMatch persisted = matchRepository.save(savedMatch);
        return matchMapper.toMatchResponse(persisted, username);
    }

    @Transactional
    public void updateMap(Long matchId, String mapName, String username) {
        if (mapName == null || mapName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Map name is required");
        }

        ScrimMatch match = matchSearchService.getMatchOrThrow(matchId);
        assertCanModifyMatchDetails(match, username);

        match.setMapName(mapName);
        matchRepository.save(match);

        simpMessagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    public MatchResponse createSoloLobby(String username, String mapSelectionMode, ServerRegion serverLocation) {

        if (matchRepository.existsActiveLobbyForUser(MatchStatus.OPEN, username, ParticipantType.SOLO)) {
            throw new IllegalStateException("You are already in an active solo lobby. Please leave it before creating a new one.");
        }

        User user = userService.getByUsername(username);

        ScrimMatch match = ScrimMatch.builder()
                .matchType(MatchType.SOLO)
                .scheduledTime(LocalDateTime.now())
                .status(MatchStatus.OPEN)
                .mapSelectionMode(mapSelectionMode)
                .serverLocation(serverLocation != null ? serverLocation : ServerRegion.SEOUL)
                .build();

        ScrimMatchPlayer hostPlayer = ScrimMatchPlayer.builder()
                .match(match)
                .user(user)
                .isReady(true)
                .participantType(ParticipantType.SOLO)
                .build();

        match.addPlayer(hostPlayer);

        ScrimMatch savedMatch = matchRepository.save(match);
        return matchMapper.toMatchResponse(savedMatch, username);
    }

    public void joinLobby(Long matchId, Long challengingTeamId, String username) {
        ScrimMatch match = matchRepository.findByIdForUpdate(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getStatus() != MatchStatus.OPEN) {
            throw new IllegalStateException("This match is no longer open");
        }

        User user = userService.getByUsername(username);
        Team challengingTeam = teamManagementService.getTeamOrThrow(challengingTeamId);

        if (!challengingTeam.isOwner(user)) {
            throw new SecurityException("Only the team owner can join a match");
        }

        if (match.getTeamHome().getId().equals(challengingTeam.getId())) {
            throw new IllegalArgumentException("You cannot play against your own team");
        }

        validateTeamCanEnterTeamMatch(challengingTeam);

        match.setTeamAway(challengingTeam);
        match.setStatus(MatchStatus.SCHEDULED);

        matchLineupService.initializeLineupForTeam(match, match.getTeamHome(), MatchSide.HOME);
        matchLineupService.initializeLineupForTeam(match, challengingTeam, MatchSide.AWAY);

        matchRepository.save(match);
        simpMessagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    public void joinSoloLobby(Long matchId, String username) {

        if (matchRepository.existsActiveLobbyForUser(MatchStatus.OPEN, username, ParticipantType.SOLO)) {
            throw new IllegalStateException("You are already in an active solo lobby. Please leave it before joining another.");
        }

        ScrimMatch match = matchRepository.findByIdForUpdate(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getMatchType() != MatchType.SOLO) {
            throw new IllegalArgumentException("This is a Team match.");
        }

        User user = userService.getByUsername(username);

        boolean alreadyJoined = match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.SOLO)
                .anyMatch(p -> p.getUser().getId().equals(user.getId()));

        if (alreadyJoined) {
            throw new IllegalArgumentException("You are already in this lobby");
        }

        long soloCount = match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.SOLO)
                .count();

        if (soloCount >= 10) {
            throw new IllegalStateException("Lobby is full");
        }

        ScrimMatchPlayer newPlayer = ScrimMatchPlayer.builder()
                .match(match)
                .user(user)
                .isReady(false)
                .participantType(ParticipantType.SOLO)
                .build();

        match.addPlayer(newPlayer);

        if (soloCount + 1 == 10) {
            match.setStatus(MatchStatus.SCHEDULED);
        }

        matchRepository.save(match);
        simpMessagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    @Transactional
    public void rescheduleMatch(Long matchId, LocalDateTime newTime, String username) {
        ScrimMatch match = matchSearchService.getMatchOrThrow(matchId);

        if (match.getMatchType() != MatchType.TEAM) {
            throw new IllegalArgumentException("Only Team Scrims can be rescheduled.");
        }

        User user = userService.getByUsername(username);

        boolean isHomeOwner = match.getTeamHome().isOwner(user);
        boolean isAwayOwner = match.getTeamAway() != null && match.getTeamAway().isOwner(user);

        if (!isHomeOwner && !isAwayOwner) {
            throw new SecurityException("Only team owners can reschedule this match");
        }

        match.setScheduledTime(newTime);
        matchRepository.save(match);
        simpMessagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    private void assertCanModifyMatchDetails(ScrimMatch match, String username) {
        User user = userService.getByUsername(username);

        if (match.getMatchType() == MatchType.TEAM) {
            boolean isHomeOwner = match.getTeamHome() != null && match.getTeamHome().isOwner(user);
            boolean isAwayOwner = match.getTeamAway() != null && match.getTeamAway().isOwner(user);

            if (!isHomeOwner && !isAwayOwner) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Only participating team owners can modify this match"
                );
            }
            return;
        }

        boolean isParticipant = match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.SOLO)
                .anyMatch(p -> p.getUser().getId().equals(user.getId()));

        if (!isParticipant) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only lobby participants can modify this match"
            );
        }
    }

    @Transactional
    public void updateServerRegion(Long matchId, ServerRegion serverLocation, String username) {
        if (serverLocation == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Server region is required");
        }

        ScrimMatch match = matchSearchService.getMatchOrThrow(matchId);
        assertCanModifyMatchDetails(match, username);

        match.setServerLocation(serverLocation);
        matchRepository.save(match);

        simpMessagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    private void validateTeamCanEnterTeamMatch(Team team) {
        int rosterSize = team.getMembers() != null ? team.getMembers().size() : 0;

        if (rosterSize < 5) {
            throw new IllegalStateException("A team must have at least 5 members to enter a team match");
        }
    }


}