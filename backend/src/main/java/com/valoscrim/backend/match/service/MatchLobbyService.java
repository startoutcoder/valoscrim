package com.valoscrim.backend.match.service;

import com.valoscrim.backend.common.enums.*;
import com.valoscrim.backend.match.MatchRepository;
import com.valoscrim.backend.match.ScrimMatch;
import com.valoscrim.backend.match.ScrimMatchPlayer;
import com.valoscrim.backend.match.dto.MatchLobbyDetailResponse;
import com.valoscrim.backend.team.Team;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchLobbyService {

    private final MatchRepository matchRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MatchReadyManager readyManager;

    @Transactional(readOnly = true)
    public MatchLobbyDetailResponse getLobbyDetails(Long matchId) {
        ScrimMatch match = matchRepository.findByIdWithLobbyData(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        List<MatchLobbyDetailResponse.LobbyPlayer> soloPlayers = null;
        MatchLobbyDetailResponse.LobbyTeam homeTeam = null;
        MatchLobbyDetailResponse.LobbyTeam awayTeam = null;

        if (match.getMatchType() == MatchType.SOLO) {
            soloPlayers = match.getPlayers().stream()
                    .filter(p -> p.getParticipantType() == ParticipantType.SOLO)
                    .map(p -> new MatchLobbyDetailResponse.LobbyPlayer(
                            p.getUser().getId(),
                            p.getUser().getUsername(),
                            p.getUser().getRiotGameName(),
                            readyManager.isSoloReady(matchId, p.getUser().getId()),
                            p.getUser().getCurrentRank(),
                            null
                    ))
                    .toList();
        } else {
            if (match.getTeamHome() != null) {
                boolean isHomeReady = readyManager.isTeamReady(matchId, MatchSide.HOME);
                homeTeam = mapTeamToLobbyTeam(match, match.getTeamHome(), MatchSide.HOME, isHomeReady);
            }
            if (match.getTeamAway() != null) {
                boolean isAwayReady = readyManager.isTeamReady(matchId, MatchSide.AWAY);
                awayTeam = mapTeamToLobbyTeam(match, match.getTeamAway(), MatchSide.AWAY, isAwayReady);
            }
        }

        return new MatchLobbyDetailResponse(
                match.getId(), match.getMatchType().name(), match.getStatus().name(),
                match.getMapName(), match.getPartyCode(), match.getMapSelectionMode(),
                match.getServerLocation(), soloPlayers, homeTeam, awayTeam
        );
    }

    public void toggleReady(Long matchId, String username) {
        ScrimMatch match = matchRepository.findByIdWithPlayers(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getMatchType() == MatchType.SOLO) {
            Long userId = getSoloUserId(match, username);
            readyManager.toggleSoloReady(matchId, userId);
        } else {
            MatchSide side = getManagedTeamSide(match, username);
            assertTeamHasValidReadyLineup(match, side == MatchSide.HOME ? match.getTeamHome() : match.getTeamAway());
            readyManager.toggleTeamReady(matchId, side);
        }

        messagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    public void setReadyState(Long matchId, String username, boolean ready) {
        ScrimMatch match = matchRepository.findByIdWithPlayers(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getMatchType() == MatchType.SOLO) {
            Long userId = getSoloUserId(match, username);
            readyManager.setSoloReady(matchId, userId, ready);
        } else {
            MatchSide side = getManagedTeamSide(match, username);
            if (ready) assertTeamHasValidReadyLineup(match, side == MatchSide.HOME ? match.getTeamHome() : match.getTeamAway());
            readyManager.setTeamReady(matchId, side, ready);
        }

        messagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    @Transactional
    public void leaveMatch(Long matchId, String username) {
        ScrimMatch match = matchRepository.findByIdForUpdate(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getMatchType() == MatchType.SOLO) {
            handleSoloLeave(match, username);
        } else {
            handleTeamLeave(match, username);
        }
    }

    private void handleTeamLeave(ScrimMatch match, String username) {
        MatchSide side = getManagedTeamSide(match, username);

        if (side == MatchSide.HOME) {
            matchRepository.delete(match);
            readyManager.clearMatch(match.getId());
            messagingTemplate.convertAndSend("/topic/match-" + match.getId(), "DELETED");
        } else {
            Team awayTeam = match.getTeamAway();

            List<ScrimMatchPlayer> awayPlayers = match.getPlayers().stream()
                    .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(awayTeam.getId()))
                    .toList();
            awayPlayers.forEach(match::removePlayer);

            match.setTeamAway(null);
            match.setStatus(MatchStatus.OPEN);

            readyManager.setTeamReady(match.getId(), MatchSide.AWAY, false);
            readyManager.setTeamReady(match.getId(), MatchSide.HOME, false);

            matchRepository.save(match);
            messagingTemplate.convertAndSend("/topic/match-" + match.getId(), "REFRESH");
        }
    }

    private void handleSoloLeave(ScrimMatch match, String username) {
        ScrimMatchPlayer playerToRemove = match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.SOLO && p.getUser().getUsername().equals(username))
                .findFirst().orElseThrow(() -> new IllegalArgumentException("You are not in this match"));

        match.removePlayer(playerToRemove);
        readyManager.setSoloReady(match.getId(), playerToRemove.getUser().getId(), false);

        long remainingSoloPlayers = match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.SOLO).count();

        if (remainingSoloPlayers == 0) {
            matchRepository.delete(match);
            readyManager.clearMatch(match.getId());
            messagingTemplate.convertAndSend("/topic/match-" + match.getId(), "DELETED");
            return;
        }

        if (remainingSoloPlayers < 10) {
            match.setStatus(MatchStatus.OPEN);
        }

        matchRepository.save(match);
        messagingTemplate.convertAndSend("/topic/match-" + match.getId(), "REFRESH");
    }

    private Long getSoloUserId(ScrimMatch match, String username) {
        return match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.SOLO && p.getUser().getUsername().equals(username))
                .map(p -> p.getUser().getId())
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("User is not in this lobby"));
    }

    private MatchSide getManagedTeamSide(ScrimMatch match, String username) {
        if (canManageTeamReady(match.getTeamHome(), username)) return MatchSide.HOME;
        if (canManageTeamReady(match.getTeamAway(), username)) return MatchSide.AWAY;
        throw new SecurityException("Only the team owner or captain can change ready status");
    }

    private boolean canManageTeamReady(Team team, String username) {
        if (team == null || username == null) return false;
        return team.getMembers().stream().anyMatch(member ->
                member.getUser() != null
                        && username.equals(member.getUser().getUsername())
                        && (member.getRole() == TeamRole.OWNER || member.getRole() == TeamRole.CAPTAIN)
        );
    }

    private void assertTeamHasValidReadyLineup(ScrimMatch match, Team team) {
        long starters = match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.TEAM_ROSTER)
                .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(team.getId()))
                .filter(p -> p.getLineupSlotStatus() == LineupSlotStatus.STARTER)
                .count();

        if (starters != 5) {
            throw new IllegalStateException("Your team must have exactly 5 starters before readying up");
        }
    }

    private MatchLobbyDetailResponse.LobbyTeam mapTeamToLobbyTeam(
            ScrimMatch match, Team team, MatchSide side, boolean isTeamReady
    ) {
        List<ScrimMatchPlayer> teamPlayers = match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.TEAM_ROSTER)
                .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(team.getId()))
                .filter(p -> p.getMatchSide() == side)
                .toList();

        List<MatchLobbyDetailResponse.LobbyPlayer> starters = teamPlayers.stream()
                .filter(p -> p.getLineupSlotStatus() == LineupSlotStatus.STARTER)
                .map(p -> toLobbyPlayer(team, p, isTeamReady))
                .toList();

        List<MatchLobbyDetailResponse.LobbyPlayer> bench = teamPlayers.stream()
                .filter(p -> p.getLineupSlotStatus() == LineupSlotStatus.BENCH)
                .map(p -> toLobbyPlayer(team, p, isTeamReady))
                .toList();

        List<MatchLobbyDetailResponse.LobbyPlayer> members = new ArrayList<>();
        members.addAll(starters);
        members.addAll(bench);

        return new MatchLobbyDetailResponse.LobbyTeam(
                team.getId(), team.getName(), team.getTag(), isTeamReady, members, starters, bench
        );
    }

    private MatchLobbyDetailResponse.LobbyPlayer toLobbyPlayer(Team team, ScrimMatchPlayer player, boolean isTeamReady) {
        return new MatchLobbyDetailResponse.LobbyPlayer(
                player.getUser().getId(), player.getUser().getUsername(), player.getUser().getRiotGameName(),
                isTeamReady, player.getUser().getCurrentRank(), resolveTeamRole(team, player.getUser().getId())
        );
    }

    private String resolveTeamRole(Team team, Long userId) {
        if (team == null || userId == null) return null;
        return team.getMembers().stream()
                .filter(member -> member.getUser() != null && userId.equals(member.getUser().getId()))
                .map(member -> member.getRole().name())
                .findFirst().orElse(null);
    }

    @Transactional
    public void removeDisconnectedUserFromOpenLobbies(String username) {
        List<ScrimMatch> participatingMatches = matchRepository.findActiveMatchesByUsernameAndType(
                MatchStatus.OPEN, username, ParticipantType.SOLO
        );
        for (ScrimMatch match : participatingMatches) {
            leaveMatch(match.getId(), username);
        }
    }
}