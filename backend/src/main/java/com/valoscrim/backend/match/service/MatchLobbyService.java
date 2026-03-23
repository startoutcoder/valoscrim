package com.valoscrim.backend.match.service;

import com.valoscrim.backend.common.enums.LineupSlotStatus;
import com.valoscrim.backend.common.enums.MatchSide;
import com.valoscrim.backend.common.enums.MatchType;
import com.valoscrim.backend.common.enums.ParticipantType;
import com.valoscrim.backend.common.enums.TeamRole;
import com.valoscrim.backend.common.enums.MatchStatus;
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
                            p.isReady(),
                            p.getUser().getCurrentRank(),
                            null
                    ))
                    .toList();
        } else {
            if (match.getTeamHome() != null) {
                homeTeam = mapTeamToLobbyTeam(match, match.getTeamHome(), MatchSide.HOME, match.isHomeTeamReady());
            }
            if (match.getTeamAway() != null) {
                awayTeam = mapTeamToLobbyTeam(match, match.getTeamAway(), MatchSide.AWAY, match.isAwayTeamReady());
            }
        }

        return new MatchLobbyDetailResponse(
                match.getId(),
                match.getMatchType().name(),
                match.getStatus().name(),
                match.getMapName(),
                match.getPartyCode(),
                match.getMapSelectionMode(),
                match.getServerLocation(),
                soloPlayers,
                homeTeam,
                awayTeam
        );
    }

    @Transactional
    public void toggleReady(Long matchId, String username) {
        ScrimMatch match = matchRepository.findByIdForUpdate(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getMatchType() == MatchType.SOLO) {
            toggleSoloPlayerReady(match, username);
        } else {
            toggleTeamReady(match, username);
        }

        matchRepository.save(match);
        messagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    @Transactional
    public void setReadyState(Long matchId, String username, boolean ready) {
        ScrimMatch match = matchRepository.findByIdForUpdate(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getMatchType() == MatchType.SOLO) {
            setSoloPlayerReady(match, username, ready);
        } else {
            setTeamReady(match, username, ready);
        }

        matchRepository.save(match);
        messagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    @Transactional
    public void leaveMatch(Long matchId, String username) {
        ScrimMatch match = matchRepository.findByIdForUpdate(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getMatchType() == MatchType.TEAM) {
            throw new IllegalStateException("Individual leave is not supported for team matches. Ask your captain to adjust the lineup or cancel the lobby.");
        }

        ScrimMatchPlayer playerToRemove = match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.SOLO)
                .filter(p -> p.getUser().getUsername().equals(username))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("You are not in this match"));

        match.removePlayer(playerToRemove);

        long remainingSoloPlayers = match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.SOLO)
                .count();

        if (remainingSoloPlayers == 0) {
            matchRepository.delete(match);
            messagingTemplate.convertAndSend("/topic/match-" + matchId, "DELETED");
            return;
        }

        if (remainingSoloPlayers < 10) {
            match.setStatus(MatchStatus.OPEN);
        }

        matchRepository.save(match);
        messagingTemplate.convertAndSend("/topic/match-" + matchId, "REFRESH");
    }

    private void toggleSoloPlayerReady(ScrimMatch match, String username) {
        ScrimMatchPlayer player = match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.SOLO)
                .filter(p -> p.getUser().getUsername().equals(username))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("User is not in this lobby"));

        player.setReady(!player.isReady());
    }

    private void setSoloPlayerReady(ScrimMatch match, String username, boolean ready) {
        ScrimMatchPlayer player = match.getPlayers().stream()
                .filter(p -> p.getParticipantType() == ParticipantType.SOLO)
                .filter(p -> p.getUser().getUsername().equals(username))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("User is not in this lobby"));

        player.setReady(ready);
    }

    private void toggleTeamReady(ScrimMatch match, String username) {
        if (canManageTeamReady(match.getTeamHome(), username)) {
            assertTeamHasValidReadyLineup(match, match.getTeamHome());
            match.setHomeTeamReady(!match.isHomeTeamReady());
            return;
        }

        if (canManageTeamReady(match.getTeamAway(), username)) {
            assertTeamHasValidReadyLineup(match, match.getTeamAway());
            match.setAwayTeamReady(!match.isAwayTeamReady());
            return;
        }

        throw new SecurityException("Only the team owner or captain can change ready status");
    }

    private void setTeamReady(ScrimMatch match, String username, boolean ready) {
        if (canManageTeamReady(match.getTeamHome(), username)) {
            if (ready) {
                assertTeamHasValidReadyLineup(match, match.getTeamHome());
            }
            match.setHomeTeamReady(ready);
            return;
        }

        if (canManageTeamReady(match.getTeamAway(), username)) {
            if (ready) {
                assertTeamHasValidReadyLineup(match, match.getTeamAway());
            }
            match.setAwayTeamReady(ready);
            return;
        }

        throw new SecurityException("Only the team owner or captain can change ready status");
    }

    private boolean canManageTeamReady(Team team, String username) {
        if (team == null || username == null) {
            return false;
        }

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
            ScrimMatch match,
            Team team,
            MatchSide side,
            boolean isTeamReady
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
                team.getId(),
                team.getName(),
                team.getTag(),
                isTeamReady,
                members,
                starters,
                bench
        );
    }

    private MatchLobbyDetailResponse.LobbyPlayer toLobbyPlayer(Team team, ScrimMatchPlayer player, boolean isTeamReady) {
        return new MatchLobbyDetailResponse.LobbyPlayer(
                player.getUser().getId(),
                player.getUser().getUsername(),
                player.getUser().getRiotGameName(),
                isTeamReady,
                player.getUser().getCurrentRank(),
                resolveTeamRole(team, player.getUser().getId())
        );
    }

    private String resolveTeamRole(Team team, Long userId) {
        if (team == null || userId == null) {
            return null;
        }

        return team.getMembers().stream()
                .filter(member -> member.getUser() != null && userId.equals(member.getUser().getId()))
                .map(member -> member.getRole().name())
                .findFirst()
                .orElse(null);
    }

    @Transactional
    public void removeDisconnectedUserFromOpenLobbies(String username) {
        List<ScrimMatch> participatingMatches = matchRepository.findActiveMatchesByUsernameAndType(
                MatchStatus.OPEN,
                username,
                ParticipantType.SOLO
        );

        for (ScrimMatch match : participatingMatches) {
            log.info("Removing ghost user {} from match lobby {} (Optimized Search)", username, match.getId());
            leaveMatch(match.getId(), username);
        }
    }
}