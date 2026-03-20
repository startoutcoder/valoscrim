
package com.valoscrim.backend.match.service;

import com.valoscrim.backend.common.enums.MatchType;
import com.valoscrim.backend.match.ScrimMatch;
import com.valoscrim.backend.match.dto.VetoRequest;
import com.valoscrim.backend.user.User;
import com.valoscrim.backend.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class MatchVetoService {

    private final MatchSearchService matchSearchService;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<Long, Map<String, Integer>> soloVotes = new ConcurrentHashMap<>();

    private final Map<Long, Set<String>> userVoted = new ConcurrentHashMap<>();

    public void handleVeto(Long matchId, VetoRequest request, String username) {
        ScrimMatch match = matchSearchService.getMatchOrThrow(matchId);

        if (match.getMatchType() == MatchType.TEAM) {
            handleTeamVeto(match, request, username);
        } else {
            handleSoloVeto(match, request, username);
        }
    }

    private void handleTeamVeto(ScrimMatch match, VetoRequest request, String username) {
        User user = userService.getByUsername(username);

        boolean isHomeOwner = match.getTeamHome() != null && match.getTeamHome().isOwner(user);
        boolean isAwayOwner = match.getTeamAway() != null && match.getTeamAway().isOwner(user);

        if (!isHomeOwner && !isAwayOwner) {
            throw new SecurityException("Only team owners can veto maps.");
        }

        messagingTemplate.convertAndSend("/topic/match-" + match.getId() + "-veto", request.mapName());
    }

    private void handleSoloVeto(ScrimMatch match, VetoRequest request, String username) {
        soloVotes.putIfAbsent(match.getId(), new ConcurrentHashMap<>());
        userVoted.putIfAbsent(match.getId(), ConcurrentHashMap.newKeySet());

        Map<String, Integer> matchVotes = soloVotes.get(match.getId());
        Set<String> voters = userVoted.get(match.getId());

        if (voters.contains(username)) {
            return;
        }

        voters.add(username);

        matchVotes.merge(request.mapName(), 1, Integer::sum);

        synchronized (matchVotes) {
            if (matchVotes.get(request.mapName()) >= 3 || voters.size() >= 5) {
                String bannedMap = matchVotes.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .get().getKey();

                messagingTemplate.convertAndSend("/topic/match-" + match.getId() + "-veto", bannedMap);

                matchVotes.clear();
                voters.clear();
            }
        }

    }

    public void cleanupMatch(Long matchId) {
        soloVotes.remove(matchId);
        userVoted.remove(matchId);
    }
}